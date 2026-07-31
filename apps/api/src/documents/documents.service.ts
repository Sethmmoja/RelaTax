import { Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "crypto";
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

  async getDownloadUrl(documentId: string, downloadedById?: string) {
    const document = await this.prisma.document.findUnique({ where: { id: documentId } });
    if (!document) throw new NotFoundException("Document not found");

    await this.prisma.auditLog.create({
      data: {
        userId: downloadedById,
        action: "DOWNLOAD",
        entityType: "document",
        entityId: document.id
      }
    });

    return { url: await this.storage.getSignedDownloadUrl(document.storageKey), document };
  }
}
