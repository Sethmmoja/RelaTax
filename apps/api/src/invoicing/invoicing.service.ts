import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import {
  DocumentCategory,
  InvoiceRequestStatus,
  InvoiceStatus,
  NotificationChannel,
  NotificationType
} from "@relatax/types";
import { PrismaService } from "../prisma/prisma.service";
import { DocumentsService } from "../documents/documents.service";
import { NotificationsService } from "../notifications/notifications.service";
import { WhatsAppTransport } from "../whatsapp/whatsapp-transport";
import { isValidKraPin } from "./kra-pin.util";

export interface CreateInvoiceRequestInput {
  businessId: string;
  requestedByUserId: string;
  customerName: string;
  customerKraPin?: string;
  itemDescription: string;
  amount: number;
}

export interface FulfillLineItemInput {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
}

export interface FulfillInvoiceRequestInput {
  staffUserId: string;
  lineItems: FulfillLineItemInput[];
  kraInvoiceNo: string;
  cuSerialNumber?: string;
  qrCodeUrl?: string;
  documentFile: { originalName: string; mimeType: string; buffer: Buffer };
}

@Injectable()
export class InvoicingService {
  constructor(
    private prisma: PrismaService,
    private documentsService: DocumentsService,
    private notifications: NotificationsService,
    private transport: WhatsAppTransport
  ) {}

  /**
   * Parses the JSON-encoded `lineItems` multipart field. Kept here rather than
   * in a DTO/pipe since class-validator can't easily validate a JSON string
   * that's nested inside another multipart field.
   */
  parseLineItems(raw: string): FulfillLineItemInput[] {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new BadRequestException("lineItems must be valid JSON.");
    }
    if (!Array.isArray(parsed) || parsed.length === 0) {
      throw new BadRequestException("At least one line item is required.");
    }
    return parsed.map((item, i) => {
      const description = (item as any)?.description;
      const quantity = Number((item as any)?.quantity);
      const unitPrice = Number((item as any)?.unitPrice);
      const taxRate = Number((item as any)?.taxRate);
      if (
        typeof description !== "string" ||
        !description.trim() ||
        !Number.isFinite(quantity) ||
        quantity <= 0 ||
        !Number.isFinite(unitPrice) ||
        unitPrice < 0 ||
        !Number.isFinite(taxRate) ||
        taxRate < 0
      ) {
        throw new BadRequestException(`Line item ${i + 1} is missing or has invalid description/quantity/unitPrice/taxRate.`);
      }
      return { description, quantity, unitPrice, taxRate };
    });
  }

  async createRequest(input: CreateInvoiceRequestInput) {
    if (input.customerKraPin && !isValidKraPin(input.customerKraPin)) {
      throw new BadRequestException("Customer KRA PIN must look like A123456789Z.");
    }
    if (!(input.amount > 0)) {
      throw new BadRequestException("Amount must be greater than zero.");
    }

    const request = await this.prisma.invoiceRequest.create({
      data: {
        businessId: input.businessId,
        requestedByUserId: input.requestedByUserId,
        customerName: input.customerName,
        customerKraPin: input.customerKraPin,
        itemDescription: input.itemDescription,
        amount: input.amount
      }
    });

    await this.notifications.notifyStaff({
      type: NotificationType.ANNOUNCEMENT,
      channels: [NotificationChannel.PORTAL],
      title: "New invoice request",
      body: `${input.customerName} — ${input.itemDescription} (KES ${input.amount.toLocaleString()}) needs an eTIMS invoice.`
    });

    return request;
  }

  async listRequests(status?: InvoiceRequestStatus) {
    return this.prisma.invoiceRequest.findMany({
      where: status ? { status: status as any } : undefined,
      include: {
        business: { select: { id: true, name: true } },
        requestedBy: { select: { id: true, name: true, email: true } }
      },
      orderBy: { createdAt: "desc" }
    });
  }

  async listRequestsForBusiness(businessId: string) {
    return this.prisma.invoiceRequest.findMany({
      where: { businessId },
      orderBy: { createdAt: "desc" }
    });
  }

  async getRequest(requestId: string) {
    const request = await this.prisma.invoiceRequest.findUnique({
      where: { id: requestId },
      include: { business: true, requestedBy: true }
    });
    if (!request) throw new NotFoundException("Invoice request not found");
    return request;
  }

  async fulfillRequest(requestId: string, input: FulfillInvoiceRequestInput) {
    const request = await this.getRequest(requestId);
    if (request.status === InvoiceRequestStatus.FULFILLED) {
      throw new BadRequestException("This request has already been fulfilled.");
    }

    const subtotal = input.lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const taxTotal = input.lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice * (item.taxRate / 100), 0);
    const total = subtotal + taxTotal;
    const lineItemsData = input.lineItems.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      taxRate: item.taxRate,
      lineTotal: item.quantity * item.unitPrice * (1 + item.taxRate / 100)
    }));

    const document = await this.documentsService.upload({
      businessId: request.businessId,
      uploadedById: input.staffUserId,
      category: DocumentCategory.INVOICE,
      originalName: input.documentFile.originalName,
      mimeType: input.documentFile.mimeType,
      buffer: input.documentFile.buffer,
      // deliverInvoice sends its own WhatsApp document message + portal notification right after this.
      notifyChannels: []
    });

    const invoice = await this.prisma.invoice.create({
      data: {
        businessId: request.businessId,
        customerName: request.customerName,
        customerKraPin: request.customerKraPin,
        status: InvoiceStatus.SENT as any,
        subtotal,
        taxTotal,
        total,
        issuedAt: new Date(),
        documentId: document.id,
        createdById: input.staffUserId,
        kraInvoiceNo: input.kraInvoiceNo,
        cuSerialNumber: input.cuSerialNumber,
        qrCodeUrl: input.qrCodeUrl,
        lineItems: { create: lineItemsData }
      }
    });

    await this.prisma.invoiceRequest.update({
      where: { id: requestId },
      data: {
        status: InvoiceRequestStatus.FULFILLED as any,
        invoiceId: invoice.id,
        reviewedById: input.staffUserId,
        reviewedAt: new Date()
      }
    });

    await this.deliverInvoice(request.businessId, document.id, document.originalName);

    return invoice;
  }

  async rejectRequest(requestId: string, staffUserId: string, reason: string) {
    const request = await this.getRequest(requestId);
    if (request.status === InvoiceRequestStatus.FULFILLED) {
      throw new BadRequestException("This request has already been fulfilled.");
    }

    await this.prisma.invoiceRequest.update({
      where: { id: requestId },
      data: {
        status: InvoiceRequestStatus.REJECTED as any,
        rejectionReason: reason,
        reviewedById: staffUserId,
        reviewedAt: new Date()
      }
    });

    await this.notifications.notifyBusiness(request.businessId, {
      type: NotificationType.ANNOUNCEMENT,
      channels: [NotificationChannel.PORTAL, NotificationChannel.WHATSAPP],
      title: "Invoice request could not be processed",
      body: `Your invoice request for ${request.customerName} was not processed: ${reason}`
    });
  }

  async listInvoicesForBusiness(businessId: string) {
    return this.prisma.invoice.findMany({
      where: { businessId },
      include: { lineItems: true, document: true },
      orderBy: { createdAt: "desc" }
    });
  }

  /** Pushes the fulfilled invoice document straight to every business member with a phone on file. */
  private async deliverInvoice(businessId: string, documentId: string, documentName: string) {
    const { url } = await this.documentsService.getDownloadUrl(documentId);

    await this.notifications.notifyBusiness(businessId, {
      type: NotificationType.COMPLETED_WORK,
      channels: [NotificationChannel.PORTAL],
      title: "Your invoice is ready",
      body: `${documentName} has been generated and added to your Invoices.`
    });

    const members = await this.prisma.businessMember.findMany({
      where: { businessId },
      include: { user: true }
    });

    for (const member of members) {
      if (!member.user.phone) continue;
      try {
        await this.transport.sendMessage(member.user.phone, {
          type: "document",
          text: "Your eTIMS invoice is ready.",
          documentUrl: url,
          documentName
        });
      } catch {
        // One member's bad phone shouldn't block delivery to the rest — same
        // tolerance NotificationsProcessor applies for its own fan-out.
      }
    }
  }
}
