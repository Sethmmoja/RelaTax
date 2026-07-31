import { Injectable, Logger } from "@nestjs/common";
import PDFDocument from "pdfkit";

export interface PayrollReportRow {
  employeeName: string;
  grossPay: number;
  deductionsTotal: number;
  netPay: number;
}

export interface PayrollReportRenderData {
  business: { name: string; logoUrl?: string | null; brandColor?: string | null };
  periodLabel: string;
  rows: PayrollReportRow[];
  generatedAt: Date;
}

const DEFAULT_BRAND_COLOR = "#c96f4a";
const PAGE_MARGIN = 50;
const CONTENT_WIDTH = 612 - PAGE_MARGIN * 2;

function money(amount: number): string {
  return `KES ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Business-facing payroll summary — distinct from the per-employee Payslip
 * PDF (which is password-protected and emailed to each employee). This one
 * is a plain register the business owner sees in their portal / over
 * WhatsApp, showing total payroll cost for the period, not individual
 * statutory breakdowns.
 */
@Injectable()
export class PayrollReportPdfService {
  private readonly logger = new Logger(PayrollReportPdfService.name);

  async render(data: PayrollReportRenderData): Promise<Buffer> {
    const logo = await this.fetchLogo(data.business.logoUrl);
    const brandColor = data.business.brandColor || DEFAULT_BRAND_COLOR;

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: PAGE_MARGIN });
      const chunks: Buffer[] = [];
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      if (logo) {
        try {
          doc.image(logo, PAGE_MARGIN, PAGE_MARGIN, { fit: [50, 50] });
        } catch {
          // A corrupt/unsupported logo shouldn't block the report.
        }
      }

      doc.fontSize(18).fillColor("#1a1a1a").text("PAYROLL REPORT", PAGE_MARGIN, PAGE_MARGIN, { align: "center", width: CONTENT_WIDTH });
      doc.fontSize(12).fillColor(brandColor).text(data.business.name.toUpperCase(), { align: "center", width: CONTENT_WIDTH });
      doc.fontSize(9).fillColor("#555555").text(`Pay Period: ${data.periodLabel}`, { align: "center", width: CONTENT_WIDTH });
      doc.moveDown(0.8);
      doc.moveTo(PAGE_MARGIN, doc.y).lineTo(PAGE_MARGIN + CONTENT_WIDTH, doc.y).strokeColor("#1a1a1a").lineWidth(1).stroke();
      doc.moveDown(0.6);

      const colWidths = { name: 220, gross: 110, deductions: 110, net: 110 };
      const header = (y: number) => {
        doc.fontSize(9).font("Helvetica-Bold").fillColor("#555555");
        let x = PAGE_MARGIN;
        doc.text("Employee", x, y, { width: colWidths.name });
        x += colWidths.name;
        doc.text("Gross Pay", x, y, { width: colWidths.gross, align: "right" });
        x += colWidths.gross;
        doc.text("Deductions", x, y, { width: colWidths.deductions, align: "right" });
        x += colWidths.deductions;
        doc.text("Net Pay", x, y, { width: colWidths.net, align: "right" });
        doc.font("Helvetica");
      };

      header(doc.y);
      doc.moveDown(0.8);
      doc.moveTo(PAGE_MARGIN, doc.y).lineTo(PAGE_MARGIN + CONTENT_WIDTH, doc.y).strokeColor("#dddddd").lineWidth(0.5).stroke();
      doc.moveDown(0.4);

      let totalGross = 0;
      let totalDeductions = 0;
      let totalNet = 0;

      for (const row of data.rows) {
        const y = doc.y;
        doc.fontSize(9.5).fillColor("#333333");
        let x = PAGE_MARGIN;
        doc.text(row.employeeName, x, y, { width: colWidths.name });
        x += colWidths.name;
        doc.text(money(row.grossPay), x, y, { width: colWidths.gross, align: "right" });
        x += colWidths.gross;
        doc.text(money(row.deductionsTotal), x, y, { width: colWidths.deductions, align: "right" });
        x += colWidths.deductions;
        doc.text(money(row.netPay), x, y, { width: colWidths.net, align: "right" });
        doc.moveDown(0.6);

        totalGross += row.grossPay;
        totalDeductions += row.deductionsTotal;
        totalNet += row.netPay;
      }

      doc.moveTo(PAGE_MARGIN, doc.y).lineTo(PAGE_MARGIN + CONTENT_WIDTH, doc.y).strokeColor("#1a1a1a").lineWidth(1).stroke();
      doc.moveDown(0.4);

      const totalsY = doc.y;
      doc.font("Helvetica-Bold").fontSize(10).fillColor("#1a1a1a");
      let x = PAGE_MARGIN;
      doc.text(`${data.rows.length} employee${data.rows.length === 1 ? "" : "s"}`, x, totalsY, { width: colWidths.name });
      x += colWidths.name;
      doc.text(money(totalGross), x, totalsY, { width: colWidths.gross, align: "right" });
      x += colWidths.gross;
      doc.text(money(totalDeductions), x, totalsY, { width: colWidths.deductions, align: "right" });
      x += colWidths.deductions;
      doc.fillColor(brandColor).text(money(totalNet), x, totalsY, { width: colWidths.net, align: "right" });
      doc.font("Helvetica");
      doc.moveDown(1.5);

      doc.fontSize(8).fillColor("#999999").text(`Generated on ${data.generatedAt.toLocaleString()}`, PAGE_MARGIN, doc.y, {
        align: "center",
        width: CONTENT_WIDTH
      });
      doc.text("Powered by RelaTax", { align: "center", width: CONTENT_WIDTH });

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
      this.logger.warn(`Could not fetch business logo for payroll report (${logoUrl}): ${(error as Error).message}`);
      return null;
    }
  }
}
