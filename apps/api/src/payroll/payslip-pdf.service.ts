import { Injectable, Logger } from "@nestjs/common";
import PDFDocument from "pdfkit";

export interface PayslipRenderData {
  business: {
    name: string;
    logoUrl?: string | null;
    brandColor?: string | null;
  };
  employee: {
    name: string;
    email: string;
    staffNo?: string | null;
    nationalId?: string | null;
    kraPin?: string | null;
    nssfNo?: string | null;
    shifNo?: string | null;
    bankName?: string | null;
    bankAccountNumber?: string | null;
  };
  periodLabel: string;
  grossPay: number;
  nssfTier1: number;
  nssfTier2: number;
  shif: number;
  housingLevy: number;
  taxablePay: number;
  payeBeforeRelief: number;
  personalRelief: number;
  paye: number;
  otherDeductions: number;
  netPay: number;
  generatedAt: Date;
  /** Required to open the PDF — callers pass the employee's National ID. */
  password: string;
}

const DEFAULT_BRAND_COLOR = "#c96f4a";
const PAGE_MARGIN = 50;
const CONTENT_WIDTH = 612 - PAGE_MARGIN * 2; // Letter width minus margins

function money(amount: number): string {
  return `KES ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

@Injectable()
export class PayslipPdfService {
  private readonly logger = new Logger(PayslipPdfService.name);

  async render(data: PayslipRenderData): Promise<Buffer> {
    const logoBuffer = await this.fetchLogo(data.business.logoUrl);
    const brandColor = data.business.brandColor || DEFAULT_BRAND_COLOR;

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        margin: PAGE_MARGIN,
        userPassword: data.password,
        permissions: { printing: "highResolution", modifying: false, copying: false }
      });
      const chunks: Buffer[] = [];
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      this.renderHeader(doc, data, brandColor, logoBuffer);
      this.renderDetailsBox(doc, data, brandColor);
      this.renderEarnings(doc, data, brandColor);
      this.renderDeductions(doc, data, brandColor);
      this.renderSummary(doc, data, brandColor);
      this.renderFooter(doc, data);

      doc.end();
    });
  }

  private async fetchLogo(logoUrl?: string | null): Promise<Buffer | null> {
    if (!logoUrl) return null;
    try {
      const res = await fetch(logoUrl, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) return null;
      return Buffer.from(await res.arrayBuffer());
    } catch (error) {
      this.logger.warn(`Could not fetch business logo for payslip (${logoUrl}): ${(error as Error).message}`);
      return null;
    }
  }

  private renderHeader(doc: PDFKit.PDFDocument, data: PayslipRenderData, brandColor: string, logo: Buffer | null) {
    if (logo) {
      try {
        doc.image(logo, PAGE_MARGIN, PAGE_MARGIN, { fit: [60, 60] });
      } catch {
        // A corrupt/unsupported image shouldn't block the payslip itself.
      }
    }

    doc.fontSize(22).fillColor("#1a1a1a").text("PAYSLIP", PAGE_MARGIN, PAGE_MARGIN, {
      align: "center",
      width: CONTENT_WIDTH
    });
    doc.fontSize(13).fillColor(brandColor).text(data.business.name.toUpperCase(), {
      align: "center",
      width: CONTENT_WIDTH
    });
    doc.fontSize(10).fillColor("#555555").text(`Pay Period: ${data.periodLabel}`, {
      align: "center",
      width: CONTENT_WIDTH
    });

    doc.moveDown(0.8);
    doc
      .moveTo(PAGE_MARGIN, doc.y)
      .lineTo(PAGE_MARGIN + CONTENT_WIDTH, doc.y)
      .strokeColor("#1a1a1a")
      .lineWidth(1.5)
      .stroke();
    doc.moveDown(0.8);
  }

  private renderDetailsBox(doc: PDFKit.PDFDocument, data: PayslipRenderData, brandColor: string) {
    const top = doc.y;
    const colWidth = CONTENT_WIDTH / 2 - 10;

    doc.fontSize(9).fillColor(brandColor).text("EMPLOYEE DETAILS", PAGE_MARGIN, top);
    doc.fillColor("#333333").fontSize(9);
    doc.text(`Full Name: ${data.employee.name}`, PAGE_MARGIN, doc.y + 4);
    if (data.employee.staffNo) doc.text(`Staff No.: ${data.employee.staffNo}`);
    if (data.employee.nationalId) doc.text(`National ID: ${data.employee.nationalId}`);
    doc.text(`Email: ${data.employee.email}`);
    const leftBottom = doc.y;

    const rightX = PAGE_MARGIN + colWidth + 20;
    doc.fontSize(9).fillColor(brandColor).text("EMPLOYMENT INFORMATION", rightX, top);
    doc.fillColor("#333333").fontSize(9);
    doc.text(`KRA PIN: ${data.employee.kraPin ?? "—"}`, rightX, doc.y + 4);
    doc.text(`NSSF No.: ${data.employee.nssfNo ?? "—"}`, rightX);
    doc.text(`SHIF No.: ${data.employee.shifNo ?? "—"}`, rightX);
    const rightBottom = doc.y;

    doc.y = Math.max(leftBottom, rightBottom);
    doc.moveDown(1);
  }

  private sectionHeader(doc: PDFKit.PDFDocument, label: string) {
    const y = doc.y;
    doc.rect(PAGE_MARGIN, y, CONTENT_WIDTH, 18).fill("#eef1f0");
    doc.fillColor("#1a1a1a").fontSize(9).text(label, PAGE_MARGIN + 6, y + 5);
    doc.y = y + 22;
  }

  private row(doc: PDFKit.PDFDocument, label: string, value: string, opts: { bold?: boolean; color?: string } = {}) {
    const y = doc.y;
    doc.fontSize(9.5).fillColor(opts.color ?? "#333333");
    doc.font(opts.bold ? "Helvetica-Bold" : "Helvetica");
    doc.text(label, PAGE_MARGIN + 6, y, { continued: false, width: CONTENT_WIDTH - 160 });
    doc.text(value, PAGE_MARGIN, y, { align: "right", width: CONTENT_WIDTH - 6 });
    doc.font("Helvetica");
    doc.y = y + 16;
  }

  private renderEarnings(doc: PDFKit.PDFDocument, data: PayslipRenderData, brandColor: string) {
    this.sectionHeader(doc, "EARNINGS");
    this.row(doc, "Basic Pay", money(data.grossPay));
    this.row(doc, "GROSS PAY", money(data.grossPay), { bold: true, color: brandColor });
    doc.moveDown(0.4);
  }

  private renderDeductions(doc: PDFKit.PDFDocument, data: PayslipRenderData, brandColor: string) {
    this.sectionHeader(doc, "ALLOWABLE DEDUCTIONS");
    this.row(doc, "NSSF Tier I", money(data.nssfTier1));
    this.row(doc, "NSSF Tier II", money(data.nssfTier2));
    this.row(doc, "SHIF (Social Health Insurance)", money(data.shif));
    this.row(doc, "Housing Levy", money(data.housingLevy));
    doc.moveTo(PAGE_MARGIN, doc.y).lineTo(PAGE_MARGIN + CONTENT_WIDTH, doc.y).strokeColor("#dddddd").lineWidth(0.5).stroke();
    doc.moveDown(0.3);
    this.row(doc, "Sub Total", money(data.nssfTier1 + data.nssfTier2 + data.shif + data.housingLevy), { bold: true });
    doc.moveDown(0.2);
    this.row(doc, "TAXABLE PAY", money(data.taxablePay), { bold: true, color: brandColor });
    doc.moveDown(0.4);

    this.row(doc, "PAYE Before Relief", money(data.payeBeforeRelief));
    this.row(doc, "Personal Relief", money(data.personalRelief));
    this.row(doc, "Final PAYE", money(data.paye), { bold: true, color: brandColor });
    doc.moveDown(0.2);
    this.row(doc, "PAY AFTER TAX", money(data.taxablePay - data.paye), { bold: true });
    doc.moveDown(0.5);
  }

  private renderSummary(doc: PDFKit.PDFDocument, data: PayslipRenderData, brandColor: string) {
    this.sectionHeader(doc, "LESS: OTHER DEDUCTIONS");
    if (data.otherDeductions) {
      this.row(doc, "Other deductions", money(data.otherDeductions));
    } else {
      doc.fontSize(9).fillColor("#777777").font("Helvetica-Oblique").text("No Other Deductions", PAGE_MARGIN + 6, doc.y);
      doc.font("Helvetica");
      doc.y += 16;
    }
    doc.moveDown(0.5);

    const y = doc.y;
    doc.rect(PAGE_MARGIN, y, CONTENT_WIDTH, 30).fill("#eef1f0");
    doc.fontSize(13).fillColor("#1a1a1a").font("Helvetica-Bold").text("NET PAY", PAGE_MARGIN + 10, y + 8);
    doc.fontSize(13).fillColor(brandColor).text(money(data.netPay), PAGE_MARGIN, y + 8, { align: "right", width: CONTENT_WIDTH - 10 });
    doc.font("Helvetica");
    doc.y = y + 40;
  }

  private renderFooter(doc: PDFKit.PDFDocument, data: PayslipRenderData) {
    if (data.employee.bankName || data.employee.bankAccountNumber) {
      doc
        .fontSize(8)
        .fillColor("#777777")
        .text(
          `A/C Name: ${data.employee.name}  |  Bank: ${data.employee.bankName ?? "—"}  |  A/C No: ${data.employee.bankAccountNumber ?? "—"}`,
          PAGE_MARGIN,
          doc.y,
          { align: "center", width: CONTENT_WIDTH }
        );
      doc.moveDown(0.5);
    }

    doc
      .fontSize(8)
      .fillColor("#999999")
      .text(`Generated on ${data.generatedAt.toLocaleString()}`, PAGE_MARGIN, doc.y, { align: "center", width: CONTENT_WIDTH });
    doc.text("Powered by RelaTax", { align: "center", width: CONTENT_WIDTH });
  }
}
