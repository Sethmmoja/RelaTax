import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { ReportType, RoleName } from "@relatax/types";
import { PrismaService } from "../prisma/prisma.service";
import { StorageService } from "../documents/storage/storage.service";
import { ReportRendererService } from "./report-renderer.service";
import type { AuthenticatedUser } from "../auth/auth.types";

const TAX_REPORT_TYPES = new Set(["VAT", "PAYE", "CORPORATION_TAX"]);

export interface ReportFilters {
  from?: string;
  to?: string;
  type?: ReportType;
  page?: number;
  pageSize?: number;
}

@Injectable()
export class ReportsService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
    private renderer: ReportRendererService
  ) {}

  async findReports(businessId: string, filters: ReportFilters) {
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 25;

    const where = {
      period: {
        businessId,
        ...(filters.from ? { startDate: { gte: new Date(filters.from) } } : {}),
        ...(filters.to ? { endDate: { lte: new Date(filters.to) } } : {})
      },
      ...(filters.type ? { type: filters.type as any } : {})
    };

    const [data, total] = await Promise.all([
      this.prisma.financialReport.findMany({
        where,
        include: { period: true, document: true },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      this.prisma.financialReport.count({ where })
    ]);

    return { data, page, pageSize, total };
  }

  async exportReport(reportId: string, format: "pdf" | "xlsx", user: AuthenticatedUser) {
    const report = await this.prisma.financialReport.findUnique({
      where: { id: reportId },
      include: { document: true, period: { include: { business: true } } }
    });
    if (!report) throw new NotFoundException("Report not found");

    // This route carries no :businessId param, so the usual BusinessMemberGuard
    // is a no-op here — ownership must be checked explicitly against the
    // report's own business, mirroring the guard's own Super-Admin-bypass /
    // staff-assignment / client-membership logic, or any authenticated user
    // could export any business's reports by id.
    const businessId = report.period.businessId;
    const hasAccess = user.isStaff
      ? user.roles.includes(RoleName.SUPER_ADMIN) || user.staffBusinessIds.includes(businessId)
      : user.businessIds.includes(businessId);
    if (!hasAccess) {
      throw new ForbiddenException("You do not have access to this report.");
    }

    await this.prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "DOWNLOAD",
        entityType: "report",
        entityId: report.id,
        metadata: { format }
      }
    });

    if (report.document) {
      return { url: await this.storage.getSignedDownloadUrl(report.document.storageKey) };
    }

    // No backing uploaded file (e.g. a QuickBooks-synced report) — render a real
    // file on the fly, pulling in actual TaxRecord figures when this report type
    // has synced tax data. Never fabricates numbers that aren't in the DB.
    const tax = TAX_REPORT_TYPES.has(report.type)
      ? await this.prisma.taxRecord.findFirst({ where: { periodId: report.periodId, taxType: report.type as any } })
      : null;

    const renderData = {
      type: report.type,
      periodLabel: report.period.label,
      startDate: report.period.startDate,
      endDate: report.period.endDate,
      source: report.source,
      businessName: report.period.business.name,
      tax: tax
        ? {
            amountDue: tax.amountDue.toNumber(),
            amountPaid: tax.amountPaid.toNumber(),
            penalty: tax.penalty.toNumber(),
            dueDate: tax.dueDate,
            status: tax.status
          }
        : undefined
    };

    const buffer =
      format === "xlsx" ? await this.renderer.renderXlsx(renderData) : await this.renderer.renderPdf(renderData);
    const mimeType =
      format === "xlsx" ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" : "application/pdf";
    const key = `generated-reports/${report.id}.${format}`;

    await this.storage.upload({ key, body: buffer, mimeType });
    return { url: await this.storage.getSignedDownloadUrl(key) };
  }
}
