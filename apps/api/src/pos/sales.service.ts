import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { DocumentCategory, SalePaymentMethod, SalePaymentStatus, StockMovementReason } from "@relatax/types";
import { PrismaService } from "../prisma/prisma.service";
import { DocumentsService } from "../documents/documents.service";
import { MpesaConnectionService } from "./mpesa/mpesa-connection.service";
import { StkPushConnector } from "./mpesa/stk-push-connector";
import { ReceiptPdfService } from "./receipt-pdf.service";

export interface SaleLineItemInput {
  productId: string;
  quantity: number;
}

interface BuiltLineItem {
  productId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  lineTotal: number;
}

@Injectable()
export class SalesService {
  constructor(
    private prisma: PrismaService,
    private documentsService: DocumentsService,
    private mpesaConnection: MpesaConnectionService,
    private stkPushConnector: StkPushConnector,
    private receiptPdf: ReceiptPdfService
  ) {}

  private async buildLineItems(businessId: string, items: SaleLineItemInput[]): Promise<BuiltLineItem[]> {
    if (items.length === 0) throw new BadRequestException("A sale needs at least one item.");

    const products = await this.prisma.product.findMany({
      where: { businessId, id: { in: items.map((i) => i.productId) } }
    });
    const byId = new Map(products.map((p) => [p.id, p]));

    return items.map((item) => {
      const product = byId.get(item.productId);
      if (!product) throw new NotFoundException(`Product ${item.productId} not found for this business.`);
      if (!product.isService && Number(product.quantityOnHand) < item.quantity) {
        throw new BadRequestException(
          `Not enough stock for ${product.name} — have ${product.quantityOnHand}, need ${item.quantity}.`
        );
      }
      const unitPrice = Number(product.unitPrice);
      const taxRate = Number(product.taxRate);
      const lineTotal = item.quantity * unitPrice * (1 + taxRate / 100);
      return { productId: product.id, description: product.name, quantity: item.quantity, unitPrice, taxRate, lineTotal };
    });
  }

  private totals(lineItems: BuiltLineItem[]) {
    const subtotal = lineItems.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
    const taxTotal = lineItems.reduce((sum, i) => sum + i.quantity * i.unitPrice * (i.taxRate / 100), 0);
    return { subtotal, taxTotal, total: subtotal + taxTotal };
  }

  async createCashSale(
    businessId: string,
    soldById: string,
    input: { customerName?: string; lineItems: SaleLineItemInput[]; cashReceived: number }
  ) {
    const lineItems = await this.buildLineItems(businessId, input.lineItems);
    const { subtotal, taxTotal, total } = this.totals(lineItems);
    if (input.cashReceived < total) {
      throw new BadRequestException(`Cash received (KES ${input.cashReceived}) is less than the total (KES ${total.toFixed(2)}).`);
    }

    const sale = await this.prisma.sale.create({
      data: {
        businessId,
        customerName: input.customerName,
        subtotal,
        taxTotal,
        total,
        paymentMethod: SalePaymentMethod.CASH as any,
        paymentStatus: SalePaymentStatus.PAID as any,
        cashReceived: input.cashReceived,
        changeGiven: input.cashReceived - total,
        soldById,
        lineItems: { create: lineItems }
      },
      include: { lineItems: true }
    });

    await this.finalizeSale(sale.id, sale.lineItems, businessId, soldById);
    return this.getSale(sale.id);
  }

  async initiateMpesaSale(
    businessId: string,
    soldById: string,
    input: { customerName?: string; customerPhone: string; lineItems: SaleLineItemInput[] }
  ) {
    const lineItems = await this.buildLineItems(businessId, input.lineItems);
    const { subtotal, taxTotal, total } = this.totals(lineItems);
    const credentials = await this.mpesaConnection.getCredentials(businessId);

    const sale = await this.prisma.sale.create({
      data: {
        businessId,
        customerName: input.customerName,
        customerPhone: input.customerPhone,
        subtotal,
        taxTotal,
        total,
        paymentMethod: SalePaymentMethod.MPESA as any,
        paymentStatus: SalePaymentStatus.PENDING as any,
        soldById,
        lineItems: { create: lineItems }
      }
    });

    const apiBaseUrl = process.env.API_BASE_URL ?? "http://localhost:4000";
    try {
      const result = await this.stkPushConnector.initiate({
        businessShortCode: credentials.shortCode,
        passkey: credentials.passkey,
        consumerKey: credentials.consumerKey,
        consumerSecret: credentials.consumerSecret,
        environment: credentials.environment,
        amount: total,
        phoneNumber: input.customerPhone,
        accountReference: sale.id,
        transactionDesc: `Sale ${sale.id}`,
        callbackUrl: `${apiBaseUrl}/api/v1/mpesa/callback`
      });
      await this.prisma.sale.update({ where: { id: sale.id }, data: { mpesaCheckoutRequestId: result.checkoutRequestId } });
    } catch (error) {
      await this.prisma.sale.update({ where: { id: sale.id }, data: { paymentStatus: SalePaymentStatus.FAILED as any } });
      throw error;
    }

    return this.getSale(sale.id);
  }

  /** Safaricom's STK push callback shape: `{ Body: { stkCallback: { CheckoutRequestID, ResultCode, CallbackMetadata? } } }`. */
  async handleMpesaCallback(payload: {
    Body?: {
      stkCallback?: {
        CheckoutRequestID?: string;
        ResultCode?: number;
        CallbackMetadata?: { Item?: { Name: string; Value: unknown }[] };
      };
    };
  }) {
    const stkCallback = payload.Body?.stkCallback;
    const checkoutRequestId = stkCallback?.CheckoutRequestID;
    if (!checkoutRequestId) return;

    const sale = await this.prisma.sale.findUnique({
      where: { mpesaCheckoutRequestId: checkoutRequestId },
      include: { lineItems: true }
    });
    if (!sale || sale.paymentStatus !== SalePaymentStatus.PENDING) return;

    if (stkCallback!.ResultCode === 0) {
      const items = stkCallback!.CallbackMetadata?.Item ?? [];
      const receiptNumber = items.find((i) => i.Name === "MpesaReceiptNumber")?.Value;
      await this.prisma.sale.update({
        where: { id: sale.id },
        data: { paymentStatus: SalePaymentStatus.PAID as any, mpesaReceiptNumber: receiptNumber ? String(receiptNumber) : null }
      });
      await this.finalizeSale(sale.id, sale.lineItems, sale.businessId, sale.soldById);
    } else {
      await this.prisma.sale.update({ where: { id: sale.id }, data: { paymentStatus: SalePaymentStatus.FAILED as any } });
    }
  }

  /** Decrements stock and renders/stores the receipt — only ever called once a sale is confirmed PAID. */
  private async finalizeSale(
    saleId: string,
    lineItems: { productId: string | null; quantity: any }[],
    businessId: string,
    soldById: string
  ) {
    for (const item of lineItems) {
      if (!item.productId) continue;
      const product = await this.prisma.product.findUnique({ where: { id: item.productId } });
      if (!product || product.isService) continue;

      await this.prisma.$transaction([
        this.prisma.product.update({
          where: { id: item.productId },
          data: { quantityOnHand: Number(product.quantityOnHand) - Number(item.quantity) }
        }),
        this.prisma.stockMovement.create({
          data: {
            productId: item.productId,
            delta: -Number(item.quantity),
            reason: StockMovementReason.SALE as any,
            note: `Sale ${saleId}`
          }
        })
      ]);
    }

    const sale = await this.prisma.sale.findUniqueOrThrow({ where: { id: saleId }, include: { lineItems: true } });
    const business = await this.prisma.business.findUniqueOrThrow({ where: { id: businessId } });

    const buffer = await this.receiptPdf.render({
      business: { name: business.name, logoUrl: business.logoUrl, brandColor: business.brandColor },
      saleId: sale.id,
      customerName: sale.customerName,
      paymentMethod: sale.paymentMethod,
      mpesaReceiptNumber: sale.mpesaReceiptNumber,
      lineItems: sale.lineItems.map((i) => ({
        description: i.description,
        quantity: Number(i.quantity),
        unitPrice: Number(i.unitPrice),
        lineTotal: Number(i.lineTotal)
      })),
      subtotal: Number(sale.subtotal),
      taxTotal: Number(sale.taxTotal),
      total: Number(sale.total),
      createdAt: sale.createdAt
    });

    const document = await this.documentsService.upload({
      businessId,
      uploadedById: soldById,
      category: DocumentCategory.RECEIPT,
      originalName: `Receipt-${sale.id}.pdf`,
      mimeType: "application/pdf",
      buffer,
      notifyChannels: []
    });

    await this.prisma.sale.update({ where: { id: sale.id }, data: { documentId: document.id } });
  }

  async getSale(saleId: string) {
    const sale = await this.prisma.sale.findUnique({
      where: { id: saleId },
      include: { lineItems: true, document: true }
    });
    if (!sale) throw new NotFoundException("Sale not found");
    return sale;
  }

  async listSales(businessId: string) {
    return this.prisma.sale.findMany({
      where: { businessId },
      include: { lineItems: true, document: true },
      orderBy: { createdAt: "desc" }
    });
  }
}
