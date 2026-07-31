import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { DocumentCategory, EmployeeStatus, PayrollRunStatus } from "@relatax/types";
import { PrismaService } from "../prisma/prisma.service";
import { DocumentsService } from "../documents/documents.service";
import { EmailService } from "../email/email.service";
import { calculatePayroll } from "./payroll-calculator";
import { PayslipPdfService } from "./payslip-pdf.service";
import { PayrollReportPdfService } from "./payroll-report-pdf.service";
import { buildSecurePayslipEmail } from "./secure-payslip-email";

const DEFAULT_BRAND_COLOR = "#c96f4a";

@Injectable()
export class PayrollService {
  constructor(
    private prisma: PrismaService,
    private documentsService: DocumentsService,
    private emailService: EmailService,
    private payslipPdf: PayslipPdfService,
    private payrollReportPdf: PayrollReportPdfService
  ) {}

  async createRun(businessId: string, periodLabel: string, runById: string) {
    return this.prisma.payrollRun.create({
      data: { businessId, periodLabel, runById }
    });
  }

  async listRuns(businessId: string) {
    return this.prisma.payrollRun.findMany({
      where: { businessId },
      orderBy: { createdAt: "desc" }
    });
  }

  async getRun(runId: string) {
    const run = await this.prisma.payrollRun.findUnique({
      where: { id: runId },
      include: { payslips: { include: { employee: true, document: true } } }
    });
    if (!run) throw new NotFoundException("Payroll run not found");
    return run;
  }

  /** Recomputes every payslip for the run's business from scratch — safe to re-run while still in DRAFT/CALCULATED. */
  async calculate(runId: string) {
    const run = await this.getRun(runId);
    if (run.status === PayrollRunStatus.APPROVED || run.status === PayrollRunStatus.DISTRIBUTED) {
      throw new BadRequestException("This run has already been approved and can no longer be recalculated.");
    }

    const employees = await this.prisma.employee.findMany({
      where: { businessId: run.businessId, status: EmployeeStatus.ACTIVE as any }
    });
    if (employees.length === 0) {
      throw new BadRequestException("This business has no active employees to run payroll for.");
    }

    // The payslip PDF is password-protected with the employee's National ID,
    // so it must be on file before a run can be calculated.
    const missingNationalId = employees.filter((e) => !e.nationalId);
    if (missingNationalId.length > 0) {
      throw new BadRequestException(
        `Add a National ID for: ${missingNationalId.map((e) => e.name).join(", ")} before running payroll — it's used to password-protect their payslip.`
      );
    }

    await this.prisma.payslip.deleteMany({ where: { payrollRunId: runId } });

    const payslipsData = employees.map((employee) => {
      const result = calculatePayroll({ basicSalary: Number(employee.basicSalary) });
      return {
        payrollRunId: runId,
        employeeId: employee.id,
        grossPay: result.grossPay,
        nssfTier1: result.nssfTier1,
        nssfTier2: result.nssfTier2,
        nssf: result.nssf,
        shif: result.shif,
        housingLevy: result.housingLevy,
        taxablePay: result.taxablePay,
        payeBeforeRelief: result.payeBeforeRelief,
        personalRelief: result.personalRelief,
        paye: result.paye,
        netPay: result.netPay
      };
    });

    await this.prisma.payslip.createMany({ data: payslipsData });
    await this.prisma.payrollRun.update({
      where: { id: runId },
      data: { status: PayrollRunStatus.CALCULATED as any }
    });

    return this.getRun(runId);
  }

  async approve(runId: string) {
    const run = await this.getRun(runId);
    if (run.status !== PayrollRunStatus.CALCULATED) {
      throw new BadRequestException("Only a calculated run can be approved.");
    }
    return this.prisma.payrollRun.update({
      where: { id: runId },
      data: { status: PayrollRunStatus.APPROVED as any }
    });
  }

  /** Renders a password-protected payslip PDF and emails it to every employee on the run, then marks it distributed. */
  async distribute(runId: string, staffUserId: string) {
    const run = await this.getRun(runId);
    if (run.status !== PayrollRunStatus.APPROVED) {
      throw new BadRequestException("Only an approved run can be distributed.");
    }

    const business = await this.prisma.business.findUniqueOrThrow({ where: { id: run.businessId } });
    const brandColor = business.brandColor || DEFAULT_BRAND_COLOR;
    const generatedAt = new Date();

    for (const payslip of run.payslips) {
      const employee = payslip.employee;
      if (!employee.nationalId) {
        // Shouldn't happen (calculate() already enforces this), but never emit an unprotected payslip.
        continue;
      }

      const buffer = await this.payslipPdf.render({
        business: { name: business.name, logoUrl: business.logoUrl, brandColor: business.brandColor },
        employee: {
          name: employee.name,
          email: employee.email,
          staffNo: employee.staffNo,
          nationalId: employee.nationalId,
          kraPin: employee.kraPin,
          nssfNo: employee.nssfNo,
          shifNo: employee.shifNo,
          bankName: employee.bankName,
          bankAccountNumber: employee.bankAccountNumber
        },
        periodLabel: run.periodLabel,
        grossPay: Number(payslip.grossPay),
        nssfTier1: Number(payslip.nssfTier1),
        nssfTier2: Number(payslip.nssfTier2),
        shif: Number(payslip.shif),
        housingLevy: Number(payslip.housingLevy),
        taxablePay: Number(payslip.taxablePay),
        payeBeforeRelief: Number(payslip.payeBeforeRelief),
        personalRelief: Number(payslip.personalRelief),
        paye: Number(payslip.paye),
        otherDeductions: Number(payslip.otherDeductions),
        netPay: Number(payslip.netPay),
        generatedAt,
        password: employee.nationalId
      });

      const document = await this.documentsService.upload({
        businessId: run.businessId,
        uploadedById: staffUserId,
        category: DocumentCategory.PAYSLIP,
        originalName: `Payslip-${employee.name}-${run.periodLabel}.pdf`,
        mimeType: "application/pdf",
        buffer,
        // The payslip goes to the employee's own email below, not the business's WhatsApp —
        // one "new document" WhatsApp ping per employee to the business owner would just be noise.
        notifyChannels: []
      });

      await this.prisma.payslip.update({
        where: { id: payslip.id },
        data: { documentId: document.id }
      });

      try {
        const email = buildSecurePayslipEmail({
          employeeName: employee.name,
          businessName: business.name,
          brandColor,
          periodLabel: run.periodLabel,
          generatedAt
        });
        await this.emailService.send({
          to: employee.email,
          subject: email.subject,
          body: email.text,
          html: email.html,
          attachments: [
            {
              filename: `Payslip-${run.periodLabel}.pdf`,
              content: buffer,
              contentType: "application/pdf"
            }
          ]
        });
        await this.prisma.payslip.update({ where: { id: payslip.id }, data: { emailedAt: new Date() } });
      } catch {
        // One employee's bad email shouldn't block distribution to the rest;
        // emailedAt staying null on their row is the visible signal to retry.
      }
    }

    const reportBuffer = await this.payrollReportPdf.render({
      business: { name: business.name, logoUrl: business.logoUrl, brandColor: business.brandColor },
      periodLabel: run.periodLabel,
      rows: run.payslips.map((p) => ({
        employeeName: p.employee.name,
        grossPay: Number(p.grossPay),
        deductionsTotal: Number(p.grossPay) - Number(p.netPay),
        netPay: Number(p.netPay)
      })),
      generatedAt
    });
    const reportDocument = await this.documentsService.upload({
      businessId: run.businessId,
      uploadedById: staffUserId,
      category: DocumentCategory.PAYROLL_REPORT,
      originalName: `Payroll-Report-${run.periodLabel}.pdf`,
      mimeType: "application/pdf",
      buffer: reportBuffer
      // Unlike individual payslip uploads, the business owner genuinely wants
      // to know this exists — default notify channels (portal + WhatsApp) apply.
    });

    return this.prisma.payrollRun.update({
      where: { id: runId },
      data: { status: PayrollRunStatus.DISTRIBUTED as any, runAt: new Date(), reportDocumentId: reportDocument.id },
      include: { payslips: { include: { employee: true, document: true } } }
    });
  }

  /** Client-portal-facing summary — totals per run, not per-employee statutory detail. */
  async listSummaryForBusiness(businessId: string) {
    const runs = await this.prisma.payrollRun.findMany({
      where: { businessId, status: PayrollRunStatus.DISTRIBUTED as any },
      include: { payslips: true },
      orderBy: { createdAt: "desc" }
    });

    return runs.map((run) => ({
      id: run.id,
      periodLabel: run.periodLabel,
      status: run.status,
      runAt: run.runAt,
      reportDocumentId: run.reportDocumentId,
      employeeCount: run.payslips.length,
      totalGrossPay: run.payslips.reduce((sum, p) => sum + Number(p.grossPay), 0),
      totalNetPay: run.payslips.reduce((sum, p) => sum + Number(p.netPay), 0)
    }));
  }
}
