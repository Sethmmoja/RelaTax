import { Injectable } from "@nestjs/common";
import PDFDocument from "pdfkit";
import ExcelJS from "exceljs";

export interface ReportRenderData {
  type: string;
  periodLabel: string;
  startDate: Date;
  endDate: Date;
  source: string;
  businessName: string;
  tax?: {
    amountDue: number;
    amountPaid: number;
    penalty: number;
    dueDate: Date;
    status: string;
  };
}

function humanize(type: string): string {
  return type
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Renders an actual downloadable file for reports that have no backing
 * uploaded document (e.g. a QuickBooks-synced report awaiting real sync).
 * Includes real tax figures from TaxRecord when the report type matches one;
 * otherwise says plainly that no synced data exists yet — never fabricates numbers.
 */
@Injectable()
export class ReportRendererService {
  async renderPdf(data: ReportRenderData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      doc.fontSize(20).fillColor("#1a1a1a").text("RelaTax");
      doc.moveDown(0.5);
      doc.fontSize(14).text(`${data.businessName} — ${humanize(data.type)}`);
      doc.fontSize(10).fillColor("#555555");
      doc.text(`Period: ${data.periodLabel}`);
      doc.text(`${data.startDate.toISOString().slice(0, 10)} to ${data.endDate.toISOString().slice(0, 10)}`);
      doc.text(`Source: ${humanize(data.source)}`);
      doc.moveDown();
      doc.fillColor("#000000");

      if (data.tax) {
        doc.fontSize(12).text("Tax summary", { underline: true });
        doc.moveDown(0.3);
        doc.fontSize(10);
        doc.text(`Status: ${data.tax.status}`);
        doc.text(`Amount due: KES ${data.tax.amountDue.toLocaleString()}`);
        doc.text(`Amount paid: KES ${data.tax.amountPaid.toLocaleString()}`);
        if (data.tax.penalty) doc.text(`Penalty: KES ${data.tax.penalty.toLocaleString()}`);
        doc.text(`Due date: ${data.tax.dueDate.toISOString().slice(0, 10)}`);
      } else {
        doc
          .fontSize(10)
          .fillColor("#555555")
          .text(
            "No synced financial data is available for this report yet. Contact your accountant or ask the AI assistant for a summary."
          );
      }

      doc.end();
    });
  }

  async renderXlsx(data: ReportRenderData): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(humanize(data.type).slice(0, 31));

    sheet.addRow(["RelaTax", data.businessName]);
    sheet.addRow([humanize(data.type), data.periodLabel]);
    sheet.addRow([
      "Period",
      `${data.startDate.toISOString().slice(0, 10)} to ${data.endDate.toISOString().slice(0, 10)}`
    ]);
    sheet.addRow(["Source", humanize(data.source)]);
    sheet.addRow([]);

    if (data.tax) {
      sheet.addRow(["Status", data.tax.status]);
      sheet.addRow(["Amount due (KES)", data.tax.amountDue]);
      sheet.addRow(["Amount paid (KES)", data.tax.amountPaid]);
      sheet.addRow(["Penalty (KES)", data.tax.penalty]);
      sheet.addRow(["Due date", data.tax.dueDate.toISOString().slice(0, 10)]);
    } else {
      sheet.addRow(["No synced financial data is available for this report yet."]);
    }

    sheet.columns.forEach((col) => {
      col.width = 30;
    });

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }
}
