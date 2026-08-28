import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "crypto";
import { Prisma } from "@prisma/client";
import { DocumentCategory, NotificationChannel, NotificationType, ReportType } from "@relatax/types";
import { PrismaService } from "../prisma/prisma.service";
import { StorageService } from "./storage/storage.service";
import { AiIndexingService } from "../ai/ai-indexing.service";
import { NotificationsService } from "../notifications/notifications.service";

export interface UploadDocumentInput {
  businessId: string;
  uploadedById: string;
  category: DocumentCategory;
  reportType?: ReportType;
  periodId?: string;
  periodLabel?: string;
  periodStart?: string;
  periodEnd?: string;
  originalName: string;
  mimeType: string;
  buffer: Buffer;
  /** Set for files imported from a connected cloud drive, to dedupe re-imports. */
  externalFileId?: string;
  /** Overrides the default "new document uploaded" notification channels — pass an empty array to suppress it entirely (e.g. when the caller already sends its own, more specific notification for this upload). */
  notifyChannels?: NotificationChannel[];
}

@Injectable()
export class DocumentsService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
    private aiIndexing: AiIndexingService,
    private notifications: NotificationsService
  ) {}

  async upload(input: UploadDocumentInput) {
    // The client-supplied filename must never be used as a raw path segment —
    // unsanitized, "../other-business/x.pdf" could write outside this
    // business's prefix in the shared bucket.
    const safeName = input.originalName.replace(/[/\\]/g, "_").replace(/[^\w.\- ]/g, "_").slice(-200) || "file";
    const storageKey = `${input.businessId}/${randomUUID()}-${safeName}`;

    await this.storage.upload({ key: storageKey, body: input.buffer, mimeType: input.mimeType });

    const periodId = await this.resolvePeriodId(input);

    const document = await this.prisma.document.create({
      data: {
        businessId: input.businessId,
        uploadedById: input.uploadedById,
        category: input.category as any,
        reportType: input.reportType as any,
        periodId,
        originalName: input.originalName,
        mimeType: input.mimeType,
        sizeBytes: input.buffer.byteLength,
        storageKey,
        externalFileId: input.externalFileId
      },
      include: { period: true }
    });

    await this.aiIndexing.indexDocument(document.id).catch(() => undefined);

    const notifyChannels = input.notifyChannels ?? [NotificationChannel.PORTAL, NotificationChannel.WHATSAPP];
    if (notifyChannels.length > 0) {
      await this.notifications.notifyBusiness(input.businessId, {
        type: NotificationType.NEW_DOCUMENT,
        channels: notifyChannels,
        title: "New document uploaded",
        body: `${input.originalName} has been added to your account.`
      });
    }

    return document;
  }

  /** Reuses an existing period by id, or upserts one from an inline label/date range. */
  private async resolvePeriodId(input: UploadDocumentInput): Promise<string | undefined> {
    if (input.periodId) return input.periodId;
    if (!input.periodLabel || !input.periodStart || !input.periodEnd) return undefined;

    const period = await this.prisma.reportPeriod.upsert({
      where: { id: `${input.businessId}-${input.periodLabel}` },
      create: {
        id: `${input.businessId}-${input.periodLabel}`,
        businessId: input.businessId,
        label: input.periodLabel,
        startDate: new Date(input.periodStart),
        endDate: new Date(input.periodEnd)
      },
      update: {}
    });
    return period.id;
  }

  async listForBusiness(businessId: string, category?: DocumentCategory) {
    return this.prisma.document.findMany({
      where: { businessId, category: category as any },
      include: { period: true },
      orderBy: { createdAt: "desc" }
    });
  }

  async listPeriodsForBusiness(businessId: string) {
    return this.prisma.reportPeriod.findMany({
      where: { businessId },
      orderBy: { startDate: "desc" }
    });
  }

  /** 404s rather than 403s when the document belongs to another business — never confirms it exists. */
  private async getOwnedDocument(businessId: string, documentId: string) {
    const document = await this.prisma.document.findUnique({ where: { id: documentId } });
    if (!document || document.businessId !== businessId) throw new NotFoundException("Document not found");
    return document;
  }

  private async logAccess(documentId: string, userId: string | undefined, action: string) {
    await this.prisma.auditLog.create({
      data: { userId, action, entityType: "document", entityId: documentId }
    });
  }

  async getDownloadUrl(businessId: string, documentId: string, downloadedById?: string) {
    const document = await this.getOwnedDocument(businessId, documentId);
    await this.logAccess(document.id, downloadedById, "DOWNLOAD");
    const url = await this.storage.getSignedDownloadUrl(document.storageKey, {
      disposition: "attachment",
      filename: document.originalName
    });
    return { url, document };
  }

  /** Same as download, but renders in the browser tab instead of forcing a save-as. */
  async getViewUrl(businessId: string, documentId: string, viewedById?: string) {
    const document = await this.getOwnedDocument(businessId, documentId);
    await this.logAccess(document.id, viewedById, "VIEW");
    const url = await this.storage.getSignedDownloadUrl(document.storageKey, {
      disposition: "inline",
      filename: document.originalName
    });
    return { url, document };
  }

  /**
   * Generated records (Invoice, Receipt, Payslip, FinancialReport, Sale,
   * PayrollRun's report, EmployeeDocument) point at their own Document row.
   * These are all OPTIONAL FKs, so Prisma's default (no explicit onDelete)
   * is SetNull, not Restrict — the database will NOT reject the delete, it
   * will silently null out the link and we'd lose the record's only
   * reference to its generated PDF. So this check happens explicitly, in
   * application code, before the delete is ever attempted.
   */
  private async findLinkedRecord(documentId: string): Promise<string | null> {
    const [invoice, receipt, financialReport, payslip, sale, payrollRun, employeeDocument] = await Promise.all([
      this.prisma.invoice.findFirst({ where: { documentId }, select: { id: true } }),
      this.prisma.receipt.findFirst({ where: { documentId }, select: { id: true } }),
      this.prisma.financialReport.findFirst({ where: { documentId }, select: { id: true } }),
      this.prisma.payslip.findFirst({ where: { documentId }, select: { id: true } }),
      this.prisma.sale.findFirst({ where: { documentId }, select: { id: true } }),
      this.prisma.payrollRun.findFirst({ where: { reportDocumentId: documentId }, select: { id: true } }),
      this.prisma.employeeDocument.findFirst({ where: { documentId }, select: { id: true } })
    ]);

    if (invoice) return "invoice";
    if (receipt) return "receipt";
    if (financialReport) return "financial report";
    if (payslip) return "payslip";
    if (sale) return "sale receipt";
    if (payrollRun) return "payroll report";
    if (employeeDocument) return "employee record";
    return null;
  }

  async delete(businessId: string, documentId: string, deletedById?: string): Promise<{ success: true }> {
    const document = await this.getOwnedDocument(businessId, documentId);

    const linkedTo = await this.findLinkedRecord(document.id);
    if (linkedTo) {
      throw new ConflictException(`This document is linked to a generated ${linkedTo} and can't be deleted directly.`);
    }

    try {
      await this.prisma.document.delete({ where: { id: document.id } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
        throw new ConflictException("This document is linked to another record and can't be deleted directly.");
      }
      throw error;
    }

    await Promise.all([
      this.storage.delete(document.storageKey),
      this.prisma.knowledgeBaseChunk.deleteMany({ where: { sourceType: "document", sourceRef: document.id } })
    ]);
    await this.logAccess(document.id, deletedById, "DELETE");

    return { success: true };
  }

  /**
   * Swaps a document's file content in place (same row id), so anything
   * pointing at it (an Invoice, Payslip, etc.) keeps working — unlike
   * delete, this is never blocked by those FK relations.
   */
  async replace(
    businessId: string,
    documentId: string,
    input: { originalName: string; mimeType: string; buffer: Buffer },
    replacedById?: string
  ) {
    const document = await this.getOwnedDocument(businessId, documentId);

    const safeName = input.originalName.replace(/[/\\]/g, "_").replace(/[^\w.\- ]/g, "_").slice(-200) || "file";
    const newStorageKey = `${businessId}/${randomUUID()}-${safeName}`;
    await this.storage.upload({ key: newStorageKey, body: input.buffer, mimeType: input.mimeType });

    const updated = await this.prisma.document.update({
      where: { id: document.id },
      data: {
        originalName: input.originalName,
        mimeType: input.mimeType,
        sizeBytes: input.buffer.byteLength,
        storageKey: newStorageKey,
        uploadedById: replacedById ?? document.uploadedById
      },
      include: { period: true }
    });

    await Promise.all([
      this.storage.delete(document.storageKey),
      this.prisma.knowledgeBaseChunk.deleteMany({ where: { sourceType: "document", sourceRef: document.id } })
    ]);
    await this.aiIndexing.indexDocument(document.id).catch(() => undefined);
    await this.logAccess(document.id, replacedById, "REPLACE");

    return updated;
  }
}
