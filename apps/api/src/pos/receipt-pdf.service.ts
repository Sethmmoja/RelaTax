import { Injectable, Logger } from "@nestjs/common";
import PDFDocument from "pdfkit";

export interface ReceiptLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface ReceiptRenderData {
  business: { name: string; logoUrl?: string | null; brandColor?: string | null };
  saleId: string;
  customerName?: string | null;
  paymentMethod: string;
  mpesaReceiptNumber?: string | null;
  lineItems: ReceiptLineItem[];
  subtotal: number;
  taxTotal: number;
  total: number;
  createdAt: Date;
}

const DEFAULT_BRAND_COLOR = "#c96f4a";
const PAGE_MARGIN = 50;
const CONTENT_WIDTH = 612 - PAGE_MARGIN * 2;

function money(amount: number): string {
  return `KES ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

@Injectable()
export class ReceiptPdfService {
  private readonly logger = new Logger(ReceiptPdfService.name);

  async render(data: ReceiptRenderData): Promise<Buffer> {
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
          // A corrupt/unsupported logo shouldn't block the receipt.
        }
      }

      doc.fontSize(18).fillColor("#1a1a1a").text("RECEIPT", PAGE_MARGIN, PAGE_MARGIN, { align: "center", width: CONTENT_WIDTH });
      doc.fontSize(12).fillColor(brandColor).text(data.business.name.toUpperCase(), { align: "center", width: CONTENT_WIDTH });
      doc.fontSize(9).fillColor("#555555").text(`Receipt #${data.saleId.slice(-8).toUpperCase()}`, { align: "center", width: CONTENT_WIDTH });
      doc.text(data.createdAt.toLocaleString(), { align: "center", width: CONTENT_WIDTH });
      if (data.customerName) doc.text(`Customer: ${data.customerName}`, { align: "center", width: CONTENT_WIDTH });
      doc.moveDown(0.8);
      doc.moveTo(PAGE_MARGIN, doc.y).lineTo(PAGE_MARGIN + CONTENT_WIDTH, doc.y).strokeColor("#1a1a1a").lineWidth(1).stroke();
      doc.moveDown(0.6);

      doc.fillColor("#333333").fontSize(9);
      for (const item of data.lineItems) {
        const y = doc.y;
        doc.text(`${item.description} x${item.quantity}`, PAGE_MARGIN, y, { width: CONTENT_WIDTH - 100 });
        doc.text(money(item.lineTotal), PAGE_MARGIN, y, { align: "right", width: CONTENT_WIDTH });
        doc.moveDown(0.3);
      }

      doc.moveDown(0.3);
      doc.moveTo(PAGE_MARGIN, doc.y).lineTo(PAGE_MARGIN + CONTENT_WIDTH, doc.y).strokeColor("#dddddd").lineWidth(0.5).stroke();
      doc.moveDown(0.4);

      const row = (label: string, value: string, bold = false) => {
        const y = doc.y;
        doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(bold ? 11 : 9.5);
        doc.text(label, PAGE_MARGIN, y, { width: CONTENT_WIDTH - 150 });
        doc.text(value, PAGE_MARGIN, y, { align: "right", width: CONTENT_WIDTH });
        doc.font("Helvetica");
        doc.moveDown(bold ? 0.5 : 0.3);
      };

      row("Subtotal", money(data.subtotal));
      row("Tax", money(data.taxTotal));
      row("TOTAL", money(data.total), true);
      doc.moveDown(0.3);
      row("Payment method", data.paymentMethod);
      if (data.mpesaReceiptNumber) row("M-Pesa receipt", data.mpesaReceiptNumber);

      doc.moveDown(1);
      doc.fontSize(8).fillColor("#999999").text("Powered by RelaTax", PAGE_MARGIN, doc.y, { align: "center", width: CONTENT_WIDTH });

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
      this.logger.warn(`Could not fetch business logo for receipt (${logoUrl}): ${(error as Error).message}`);
      return null;
    }
  }
}
