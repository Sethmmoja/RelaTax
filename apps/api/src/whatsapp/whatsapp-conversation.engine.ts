import { Injectable, Logger } from "@nestjs/common";
import { WhatsAppState, NotificationType, NotificationChannel, ReportType, TaxStatus, DocumentCategory } from "@relatax/types";
import { PrismaService } from "../prisma/prisma.service";
import { AuthService } from "../auth/auth.service";
import { OtpService } from "../auth/otp.service";
import { BusinessesService } from "../businesses/businesses.service";
import { ReportsService } from "../reports/reports.service";
import { TaxesService } from "../taxes/taxes.service";
import { DocumentsService } from "../documents/documents.service";
import { NotificationsService } from "../notifications/notifications.service";
import { AiService } from "../ai/ai.types";
import { BusinessFactsService } from "../ai/business-facts.service";
import { InvoicingService } from "../invoicing/invoicing.service";
import { isValidKraPin } from "../invoicing/kra-pin.util";
import { WhatsAppTransport } from "./whatsapp-transport";
import { resolveDateRange } from "./date-range.util";
import { pushRecentRequest, WhatsAppSessionContext } from "./whatsapp-session-context";

const SESSION_TTL_MS = 30 * 60 * 1000;

const REPORT_TYPE_MENU: { id: string; type: ReportType; title: string }[] = [
  { id: "1", type: ReportType.FINANCIAL_STATEMENT, title: "Financial Statements" },
  { id: "2", type: ReportType.PROFIT_AND_LOSS, title: "Profit & Loss" },
  { id: "3", type: ReportType.BALANCE_SHEET, title: "Balance Sheet" },
  { id: "4", type: ReportType.CASH_FLOW, title: "Cash Flow" },
  { id: "5", type: ReportType.TRIAL_BALANCE, title: "Trial Balance" },
  { id: "6", type: ReportType.VAT, title: "VAT" },
  { id: "7", type: ReportType.PAYE, title: "PAYE" },
  { id: "8", type: ReportType.CORPORATION_TAX, title: "Corporation Tax" },
  { id: "9", type: ReportType.DRAFT, title: "Draft Reports" },
  { id: "10", type: ReportType.CUSTOM, title: "Custom Uploaded Reports" }
];

@Injectable()
export class WhatsAppConversationEngine {
  private readonly logger = new Logger(WhatsAppConversationEngine.name);

  constructor(
    private prisma: PrismaService,
    private authService: AuthService,
    private otpService: OtpService,
    private businessesService: BusinessesService,
    private reportsService: ReportsService,
    private taxesService: TaxesService,
    private documentsService: DocumentsService,
    private notificationsService: NotificationsService,
    private aiService: AiService,
    private businessFacts: BusinessFactsService,
    private invoicingService: InvoicingService,
    private transport: WhatsAppTransport
  ) {}

  async handleInbound(phone: string, rawText: string): Promise<void> {
    const text = rawText.trim();
    const session = await this.prisma.whatsAppSession.upsert({
      where: { phone },
      create: { phone, state: WhatsAppState.AWAITING_OTP },
      update: {}
    });

    const authenticated = Boolean(session.userId) && Boolean(session.expiresAt) && session.expiresAt! > new Date();

    if (!authenticated) {
      return this.handleAuth(phone, text, session.state as WhatsAppState);
    }

    // Sliding expiry: any authenticated message renews the session.
    await this.prisma.whatsAppSession.update({
      where: { phone },
      data: { expiresAt: new Date(Date.now() + SESSION_TTL_MS) }
    });

    const normalized = text.toLowerCase();
    if (normalized === "menu" || normalized === "0") {
      return this.showMainMenu(phone);
    }
    if (normalized === "switch business" || normalized === "switch") {
      return this.showBusinessSelector(phone);
    }
    if (normalized === "talk to a human" || normalized === "human") {
      return this.escalate(phone, session.userId!, session.activeBusinessId ?? undefined);
    }

    switch (session.state as WhatsAppState) {
      case WhatsAppState.MAIN_MENU:
        return this.handleMainMenuChoice(phone, session.userId!, text);
      case WhatsAppState.SELECT_BUSINESS:
        return this.handleBusinessSelection(phone, session.userId!, text);
      case WhatsAppState.REPORTS_SELECT_RANGE:
        return this.handleReportRangeSelection(phone, text);
      case WhatsAppState.REPORTS_SELECT_TYPE:
        return this.handleReportTypeSelection(phone, text);
      case WhatsAppState.TAXES_MENU:
        return this.handleTaxesSelection(phone, text);
      case WhatsAppState.INVOICES_ACTION_MENU:
        return this.handleInvoicesActionChoice(phone, text);
      case WhatsAppState.INVOICE_REQUEST_CUSTOMER_NAME:
        return this.handleInvoiceRequestCustomerName(phone, text);
      case WhatsAppState.INVOICE_REQUEST_KRA_PIN:
        return this.handleInvoiceRequestKraPin(phone, text);
      case WhatsAppState.INVOICE_REQUEST_ITEM:
        return this.handleInvoiceRequestItem(phone, text);
      case WhatsAppState.INVOICE_REQUEST_AMOUNT:
        return this.handleInvoiceRequestAmount(phone, text);
      case WhatsAppState.INVOICE_REQUEST_CONFIRM:
        return this.handleInvoiceRequestConfirm(phone, session.userId!, text, session.activeBusinessId!);
      case WhatsAppState.INVOICES_MENU:
      case WhatsAppState.RECEIPTS_MENU:
      case WhatsAppState.PAYROLL_MENU:
        return this.handleDocumentPick(phone, text);
      case WhatsAppState.DOCUMENTS_MENU:
        return this.handleDocumentsCategorySelection(phone, text);
      case WhatsAppState.AI_CHAT:
        return this.handleAiChat(phone, text, session.activeBusinessId ?? undefined);
      case WhatsAppState.ESCALATION:
        return this.handleEscalationChoice(phone, session.userId!, text, session.activeBusinessId ?? undefined);
      default:
        return this.showMainMenu(phone);
    }
  }

  // -- Authentication -------------------------------------------------------

  private async handleAuth(phone: string, text: string, state: WhatsAppState) {
    if (state === WhatsAppState.AWAITING_OTP && /^\d{6}$/.test(text)) {
      const valid = await this.otpService.verifyOtp(phone, text);
      if (!valid) {
        return this.transport.sendMessage(phone, {
          type: "text",
          text: "That code didn't match or has expired. Reply with a new attempt, or type 'resend'."
        });
      }
      const user = await this.authService.findAuthenticatedUserByPhone(phone);
      if (!user) {
        return this.transport.sendMessage(phone, {
          type: "text",
          text: "This number isn't linked to a RelaTax account yet. Please contact us to set up portal access."
        });
      }
      await this.prisma.whatsAppSession.update({
        where: { phone },
        data: {
          userId: user.id,
          state: WhatsAppState.MAIN_MENU,
          expiresAt: new Date(Date.now() + SESSION_TTL_MS),
          context: {}
        }
      });
      await this.transport.sendMessage(phone, { type: "text", text: `Welcome back, ${user.name}.` });
      return this.showMainMenu(phone);
    }

    const user = await this.authService.findAuthenticatedUserByPhone(phone);
    if (!user) {
      return this.transport.sendMessage(phone, {
        type: "text",
        text: "This number isn't registered with RelaTax. Please contact us to set up your portal access."
      });
    }

    await this.otpService.requestOtp(phone);
    await this.prisma.whatsAppSession.update({
      where: { phone },
      data: { state: WhatsAppState.AWAITING_OTP }
    });
    return this.transport.sendMessage(phone, {
      type: "text",
      text: "Welcome to RelaTax. We've sent a 6-digit verification code — reply with it to continue."
    });
  }

  // -- Main menu --------------------------------------------------------------

  private async showMainMenu(phone: string) {
    await this.prisma.whatsAppSession.update({ where: { phone }, data: { state: WhatsAppState.MAIN_MENU } });
    return this.transport.sendMessage(phone, {
      type: "list",
      text: "RelaTax Assistant — how can I help?",
      options: [
        { id: "1", title: "My Businesses" },
        { id: "2", title: "Reports" },
        { id: "3", title: "Taxes" },
        { id: "4", title: "Invoices" },
        { id: "5", title: "Receipts" },
        { id: "6", title: "Payroll Reports" },
        { id: "7", title: "Notifications" },
        { id: "8", title: "My Documents" },
        { id: "9", title: "Ask AI" },
        { id: "10", title: "Book Consultation" },
        { id: "11", title: "Contact RelaTax" }
      ]
    });
  }

  private async handleMainMenuChoice(phone: string, userId: string, choice: string) {
    switch (choice) {
      case "1":
        return this.showBusinessSelector(phone, "switch");
      case "2":
        return this.startFlowRequiringBusiness(phone, userId, "reports");
      case "3":
        return this.startFlowRequiringBusiness(phone, userId, "taxes");
      case "4":
        return this.startFlowRequiringBusiness(phone, userId, "invoices");
      case "5":
        return this.startFlowRequiringBusiness(phone, userId, "receipts");
      case "6":
        return this.startFlowRequiringBusiness(phone, userId, "payroll");
      case "7":
        return this.showNotifications(phone, userId);
      case "8":
        return this.startFlowRequiringBusiness(phone, userId, "documents");
      case "9":
        await this.prisma.whatsAppSession.update({ where: { phone }, data: { state: WhatsAppState.AI_CHAT } });
        return this.transport.sendMessage(phone, {
          type: "text",
          text: "Ask me anything about your finances, taxes, or reports. Type 'menu' any time to go back."
        });
      case "10":
        return this.bookConsultation(phone);
      case "11":
        return this.contactRelaTax(phone);
      default:
        return this.transport.sendMessage(phone, {
          type: "text",
          text: "Sorry, I didn't recognize that option. Reply with a number from the menu, or type 'menu'."
        });
    }
  }

  private async startFlowRequiringBusiness(
    phone: string,
    userId: string,
    flow: "reports" | "taxes" | "invoices" | "receipts" | "payroll" | "documents"
  ) {
    const businesses = await this.businessesService.listForUser(userId);
    const session = await this.prisma.whatsAppSession.findUniqueOrThrow({ where: { phone } });

    if (businesses.length === 0) {
      return this.transport.sendMessage(phone, {
        type: "text",
        text: "You don't have any businesses set up yet. Reply 'menu' then pick 'My Businesses' to request one."
      });
    }

    if (businesses.length === 1 || session.activeBusinessId) {
      const businessId = session.activeBusinessId ?? businesses[0].id;
      await this.prisma.whatsAppSession.update({
        where: { phone },
        data: { activeBusinessId: businessId }
      });
      return this.continueFlow(phone, flow, businessId);
    }

    const context: WhatsAppSessionContext = { pendingFlow: flow };
    await this.prisma.whatsAppSession.update({
      where: { phone },
      data: { state: WhatsAppState.SELECT_BUSINESS, context: context as any }
    });
    return this.sendBusinessList(phone, businesses);
  }

  private async showBusinessSelector(phone: string, mode: "switch" | "info" = "info") {
    const session = await this.prisma.whatsAppSession.findUniqueOrThrow({ where: { phone } });
    const businesses = await this.businessesService.listForUser(session.userId!);

    if (mode === "info" && businesses.length <= 1) {
      const b = businesses[0];
      return this.transport.sendMessage(phone, {
        type: "text",
        text: b ? `Your business: ${b.name} (${b.status})` : "You have no businesses yet."
      });
    }

    const context: WhatsAppSessionContext = {};
    await this.prisma.whatsAppSession.update({
      where: { phone },
      data: { state: WhatsAppState.SELECT_BUSINESS, context: context as any }
    });
    return this.sendBusinessList(phone, businesses);
  }

  private async sendBusinessList(phone: string, businesses: { id: string; name: string }[]) {
    return this.transport.sendMessage(phone, {
      type: "list",
      text: "Which business is this for?",
      options: businesses.map((b, i) => ({ id: String(i + 1), title: b.name }))
    });
  }

  private async handleBusinessSelection(phone: string, userId: string, choice: string) {
    const businesses = await this.businessesService.listForUser(userId);
    const index = parseInt(choice, 10) - 1;
    const business = businesses[index];

    if (!business) {
      return this.transport.sendMessage(phone, { type: "text", text: "Please reply with a valid business number." });
    }

    const session = await this.prisma.whatsAppSession.findUniqueOrThrow({ where: { phone } });
    const context = (session.context as WhatsAppSessionContext) ?? {};

    await this.prisma.whatsAppSession.update({
      where: { phone },
      data: { activeBusinessId: business.id }
    });

    if (context.pendingFlow) {
      return this.continueFlow(phone, context.pendingFlow, business.id);
    }

    await this.transport.sendMessage(phone, { type: "text", text: `Switched to ${business.name}.` });
    return this.showMainMenu(phone);
  }

  private async continueFlow(
    phone: string,
    flow: "reports" | "taxes" | "invoices" | "receipts" | "payroll" | "documents",
    businessId: string
  ) {
    if (flow === "reports") return this.startReportsFlow(phone);
    if (flow === "taxes") return this.showTaxesMenu(phone);
    if (flow === "invoices") return this.showInvoicesActionMenu(phone);
    if (flow === "receipts") return this.listInvoicesOrReceipts(phone, businessId, "receipts");
    if (flow === "payroll") return this.listInvoicesOrReceipts(phone, businessId, "payroll");
    return this.showDocumentsCategoryMenu(phone);
  }

  // -- Reports ----------------------------------------------------------------

  private async startReportsFlow(phone: string) {
    await this.prisma.whatsAppSession.update({
      where: { phone },
      data: { state: WhatsAppState.REPORTS_SELECT_RANGE }
    });
    return this.transport.sendMessage(phone, {
      type: "list",
      text: "Which period?",
      options: [
        { id: "1", title: "This Month" },
        { id: "2", title: "This Quarter" },
        { id: "3", title: "This Year" }
      ]
    });
  }

  private async handleReportRangeSelection(phone: string, choice: string) {
    const map: Record<string, "month" | "quarter" | "year"> = { "1": "month", "2": "quarter", "3": "year" };
    const option = map[choice];
    if (!option) {
      return this.transport.sendMessage(phone, { type: "text", text: "Please reply with 1, 2, or 3." });
    }

    const period = resolveDateRange(option);
    const session = await this.prisma.whatsAppSession.findUniqueOrThrow({ where: { phone } });
    const context: WhatsAppSessionContext = {
      ...((session.context as WhatsAppSessionContext) ?? {}),
      currentReportPeriod: period
    };

    await this.prisma.whatsAppSession.update({
      where: { phone },
      data: { state: WhatsAppState.REPORTS_SELECT_TYPE, context: context as any }
    });

    return this.transport.sendMessage(phone, {
      type: "list",
      text: `Report type for ${period.label}?`,
      options: REPORT_TYPE_MENU.map(({ id, title }) => ({ id, title }))
    });
  }

  private async handleReportTypeSelection(phone: string, choice: string) {
    const match = REPORT_TYPE_MENU.find((r) => r.id === choice);
    if (!match) {
      return this.transport.sendMessage(phone, { type: "text", text: "Please reply with a number from the list." });
    }

    const session = await this.prisma.whatsAppSession.findUniqueOrThrow({ where: { phone } });
    const context = (session.context as WhatsAppSessionContext) ?? {};
    const period = context.currentReportPeriod!;

    const result = await this.reportsService.findReports(session.activeBusinessId!, {
      from: period.from,
      to: period.to,
      type: match.type
    });

    await this.prisma.whatsAppSession.update({
      where: { phone },
      data: { context: pushRecentRequest(context, `Reports: ${match.title} (${period.label})`) as any }
    });

    if (result.data.length === 0) {
      await this.transport.sendMessage(phone, {
        type: "text",
        text: `No ${match.title} found for ${period.label}. I can notify your accountant to prepare one — reply 'menu' to explore other options.`
      });
      return this.showMainMenu(phone);
    }

    const report = result.data[0];
    const requestingUser = session.userId ? await this.authService.findAuthenticatedUser(session.userId) : null;
    if (!requestingUser) {
      await this.transport.sendMessage(phone, { type: "text", text: "Your session has expired — reply 'menu' to sign in again." });
      return;
    }
    const exported = await this.reportsService.exportReport(report.id, "pdf", requestingUser);
    await this.transport.sendMessage(phone, {
      type: "document",
      text: `${match.title} — ${period.label}`,
      documentUrl: exported.url,
      documentName: `${match.title}-${period.label}.pdf`
    });
    return this.showMainMenu(phone);
  }

  // -- Taxes --------------------------------------------------------------

  private async showTaxesMenu(phone: string) {
    await this.prisma.whatsAppSession.update({ where: { phone }, data: { state: WhatsAppState.TAXES_MENU } });
    return this.transport.sendMessage(phone, {
      type: "list",
      text: "What would you like to see?",
      options: [
        { id: "1", title: "Taxes Due" },
        { id: "2", title: "Taxes Paid" },
        { id: "3", title: "Outstanding" },
        { id: "4", title: "Penalties" },
        { id: "5", title: "Filing History" }
      ]
    });
  }

  private async handleTaxesSelection(phone: string, choice: string) {
    const session = await this.prisma.whatsAppSession.findUniqueOrThrow({ where: { phone } });
    const businessId = session.activeBusinessId!;

    const statusMap: Record<string, TaxStatus> = {
      "1": TaxStatus.DUE,
      "2": TaxStatus.PAID,
      "3": TaxStatus.OUTSTANDING,
      "4": TaxStatus.PENALTY
    };

    if (choice === "5") {
      const history = await this.taxesService.history(businessId);
      await this.transport.sendMessage(phone, { type: "text", text: this.formatTaxRecords(history, "Filing History") });
      return this.showMainMenu(phone);
    }

    const status = statusMap[choice];
    if (!status) {
      return this.transport.sendMessage(phone, { type: "text", text: "Please reply with a number from the list." });
    }

    const records = await this.taxesService.findForBusiness(businessId, status);
    await this.transport.sendMessage(phone, { type: "text", text: this.formatTaxRecords(records, status) });
    return this.showMainMenu(phone);
  }

  private formatTaxRecords(records: { taxType: string; amountDue: any; amountPaid: any; penalty: any; dueDate: Date; period: { label: string } }[], label: string) {
    if (records.length === 0) return `No ${label.toString().toLowerCase()} records found.`;
    const lines = records.map(
      (r) => `• ${r.taxType} (${r.period.label}) — due ${r.amountDue}, paid ${r.amountPaid}, penalty ${r.penalty}, deadline ${r.dueDate.toISOString().slice(0, 10)}`
    );
    return `${label}:\n${lines.join("\n")}`;
  }

  // -- Invoices / Receipts / Documents -------------------------------------

  private async showInvoicesActionMenu(phone: string) {
    await this.prisma.whatsAppSession.update({ where: { phone }, data: { state: WhatsAppState.INVOICES_ACTION_MENU } });
    return this.transport.sendMessage(phone, {
      type: "list",
      text: "Invoices — what would you like to do?",
      options: [
        { id: "1", title: "View my invoices" },
        { id: "2", title: "Request new invoice" }
      ]
    });
  }

  private async handleInvoicesActionChoice(phone: string, choice: string) {
    const session = await this.prisma.whatsAppSession.findUniqueOrThrow({ where: { phone } });
    if (choice === "1") return this.listInvoicesOrReceipts(phone, session.activeBusinessId!, "invoices");
    if (choice === "2") return this.startInvoiceRequestFlow(phone);
    return this.transport.sendMessage(phone, { type: "text", text: "Please reply with 1 or 2." });
  }

  // -- eTIMS invoice request (WhatsApp intake → Super Admin fulfillment) ----

  private async startInvoiceRequestFlow(phone: string) {
    const session = await this.prisma.whatsAppSession.findUniqueOrThrow({ where: { phone } });
    const context: WhatsAppSessionContext = {
      ...((session.context as WhatsAppSessionContext) ?? {}),
      pendingInvoiceRequest: {}
    };
    await this.prisma.whatsAppSession.update({
      where: { phone },
      data: { state: WhatsAppState.INVOICE_REQUEST_CUSTOMER_NAME, context: context as any }
    });
    return this.transport.sendMessage(phone, {
      type: "text",
      text: "Let's get your eTIMS invoice request started. What's the customer's name?"
    });
  }

  private async handleInvoiceRequestCustomerName(phone: string, text: string) {
    if (!text.trim()) {
      return this.transport.sendMessage(phone, { type: "text", text: "Please enter the customer's name." });
    }
    const session = await this.prisma.whatsAppSession.findUniqueOrThrow({ where: { phone } });
    const pending = (session.context as WhatsAppSessionContext)?.pendingInvoiceRequest ?? {};
    const context: WhatsAppSessionContext = {
      ...((session.context as WhatsAppSessionContext) ?? {}),
      pendingInvoiceRequest: { ...pending, customerName: text.trim() }
    };
    await this.prisma.whatsAppSession.update({
      where: { phone },
      data: { state: WhatsAppState.INVOICE_REQUEST_KRA_PIN, context: context as any }
    });
    return this.transport.sendMessage(phone, {
      type: "text",
      text: "What's the customer's KRA PIN? (format A123456789Z) Reply 'skip' if they don't have one."
    });
  }

  private async handleInvoiceRequestKraPin(phone: string, text: string) {
    const trimmed = text.trim();
    let kraPin: string | null = null;
    if (trimmed.toLowerCase() !== "skip") {
      const candidate = trimmed.toUpperCase();
      if (!isValidKraPin(candidate)) {
        return this.transport.sendMessage(phone, {
          type: "text",
          text: "That doesn't look like a valid KRA PIN (format A123456789Z). Reply with a valid PIN, or 'skip'."
        });
      }
      kraPin = candidate;
    }

    const session = await this.prisma.whatsAppSession.findUniqueOrThrow({ where: { phone } });
    const pending = (session.context as WhatsAppSessionContext)?.pendingInvoiceRequest ?? {};
    const context: WhatsAppSessionContext = {
      ...((session.context as WhatsAppSessionContext) ?? {}),
      pendingInvoiceRequest: { ...pending, customerKraPin: kraPin }
    };
    await this.prisma.whatsAppSession.update({
      where: { phone },
      data: { state: WhatsAppState.INVOICE_REQUEST_ITEM, context: context as any }
    });
    return this.transport.sendMessage(phone, { type: "text", text: "What service or product was this for?" });
  }

  private async handleInvoiceRequestItem(phone: string, text: string) {
    if (!text.trim()) {
      return this.transport.sendMessage(phone, { type: "text", text: "Please describe the service or product." });
    }
    const session = await this.prisma.whatsAppSession.findUniqueOrThrow({ where: { phone } });
    const pending = (session.context as WhatsAppSessionContext)?.pendingInvoiceRequest ?? {};
    const context: WhatsAppSessionContext = {
      ...((session.context as WhatsAppSessionContext) ?? {}),
      pendingInvoiceRequest: { ...pending, itemDescription: text.trim() }
    };
    await this.prisma.whatsAppSession.update({
      where: { phone },
      data: { state: WhatsAppState.INVOICE_REQUEST_AMOUNT, context: context as any }
    });
    return this.transport.sendMessage(phone, { type: "text", text: "What's the total amount, in KES?" });
  }

  private async handleInvoiceRequestAmount(phone: string, text: string) {
    const amount = Number(text.replace(/,/g, "").trim());
    if (!Number.isFinite(amount) || amount <= 0) {
      return this.transport.sendMessage(phone, { type: "text", text: "Please reply with a valid amount, e.g. 15000." });
    }

    const session = await this.prisma.whatsAppSession.findUniqueOrThrow({ where: { phone } });
    const pending = (session.context as WhatsAppSessionContext)?.pendingInvoiceRequest ?? {};
    const context: WhatsAppSessionContext = {
      ...((session.context as WhatsAppSessionContext) ?? {}),
      pendingInvoiceRequest: { ...pending, amount }
    };
    await this.prisma.whatsAppSession.update({
      where: { phone },
      data: { state: WhatsAppState.INVOICE_REQUEST_CONFIRM, context: context as any }
    });

    return this.transport.sendMessage(phone, {
      type: "text",
      text:
        `Please confirm:\n` +
        `Customer: ${pending.customerName}\n` +
        `KRA PIN: ${pending.customerKraPin ?? "none"}\n` +
        `Item: ${pending.itemDescription}\n` +
        `Amount: KES ${amount.toLocaleString()}\n\n` +
        `Reply YES to submit, or 'menu' to cancel.`
    });
  }

  private async handleInvoiceRequestConfirm(phone: string, userId: string, text: string, businessId: string) {
    if (text.trim().toLowerCase() !== "yes") {
      return this.transport.sendMessage(phone, { type: "text", text: "Reply YES to submit, or 'menu' to cancel." });
    }

    const session = await this.prisma.whatsAppSession.findUniqueOrThrow({ where: { phone } });
    const pending = (session.context as WhatsAppSessionContext)?.pendingInvoiceRequest;
    if (!pending?.customerName || !pending.itemDescription || !pending.amount) {
      await this.transport.sendMessage(phone, { type: "text", text: "Something went wrong — let's start over." });
      return this.showMainMenu(phone);
    }

    await this.invoicingService.createRequest({
      businessId,
      requestedByUserId: userId,
      customerName: pending.customerName,
      customerKraPin: pending.customerKraPin ?? undefined,
      itemDescription: pending.itemDescription,
      amount: pending.amount
    });

    await this.transport.sendMessage(phone, {
      type: "text",
      text: "Your invoice request has been received — RelaTax will process it and send you the eTIMS invoice shortly."
    });
    return this.showMainMenu(phone);
  }

  private async listInvoicesOrReceipts(phone: string, businessId: string, kind: "invoices" | "receipts" | "payroll") {
    const category =
      kind === "invoices" ? DocumentCategory.INVOICE : kind === "receipts" ? DocumentCategory.RECEIPT : DocumentCategory.PAYROLL_REPORT;
    const documents = await this.documentsService.listForBusiness(businessId, category);
    const state =
      kind === "invoices" ? WhatsAppState.INVOICES_MENU : kind === "receipts" ? WhatsAppState.RECEIPTS_MENU : WhatsAppState.PAYROLL_MENU;
    const label = kind === "payroll" ? "payroll reports" : kind;

    await this.prisma.whatsAppSession.update({ where: { phone }, data: { state } });

    if (documents.length === 0) {
      await this.transport.sendMessage(phone, { type: "text", text: `No ${label} found yet.` });
      return this.showMainMenu(phone);
    }

    return this.transport.sendMessage(phone, {
      type: "list",
      text: `Recent ${label} — reply with a number to receive it:`,
      options: documents.slice(0, 10).map((d, i) => ({ id: String(i + 1), title: d.originalName }))
    });
  }

  private async handleDocumentPick(phone: string, choice: string) {
    const session = await this.prisma.whatsAppSession.findUniqueOrThrow({ where: { phone } });
    const state = session.state as WhatsAppState;
    const category =
      state === WhatsAppState.INVOICES_MENU
        ? DocumentCategory.INVOICE
        : state === WhatsAppState.RECEIPTS_MENU
          ? DocumentCategory.RECEIPT
          : DocumentCategory.PAYROLL_REPORT;

    const documents = await this.documentsService.listForBusiness(session.activeBusinessId!, category);
    const document = documents[parseInt(choice, 10) - 1];
    if (!document) {
      return this.transport.sendMessage(phone, { type: "text", text: "Please reply with a valid number from the list." });
    }

    const { url } = await this.documentsService.getDownloadUrl(document.id, session.userId ?? undefined);
    await this.transport.sendMessage(phone, {
      type: "document",
      documentUrl: url,
      documentName: document.originalName
    });
    return this.showMainMenu(phone);
  }

  private async showDocumentsCategoryMenu(phone: string) {
    await this.prisma.whatsAppSession.update({ where: { phone }, data: { state: WhatsAppState.DOCUMENTS_MENU } });
    return this.transport.sendMessage(phone, {
      type: "list",
      text: "Which category?",
      options: [
        { id: "1", title: "Financial Statements" },
        { id: "2", title: "Invoices" },
        { id: "3", title: "Receipts" },
        { id: "4", title: "Drafts" },
        { id: "5", title: "Other" }
      ]
    });
  }

  private async handleDocumentsCategorySelection(phone: string, choice: string) {
    const map: Record<string, DocumentCategory> = {
      "1": DocumentCategory.FINANCIAL_STATEMENT,
      "2": DocumentCategory.INVOICE,
      "3": DocumentCategory.RECEIPT,
      "4": DocumentCategory.DRAFT,
      "5": DocumentCategory.OTHER
    };
    const category = map[choice];
    if (!category) {
      return this.transport.sendMessage(phone, { type: "text", text: "Please reply with a number from the list." });
    }

    const session = await this.prisma.whatsAppSession.findUniqueOrThrow({ where: { phone } });
    const documents = await this.documentsService.listForBusiness(session.activeBusinessId!, category);

    if (documents.length === 0) {
      await this.transport.sendMessage(phone, { type: "text", text: "No documents found in that category yet." });
      return this.showMainMenu(phone);
    }

    const lines = documents.slice(0, 10).map((d) => `• ${d.originalName}`);
    await this.transport.sendMessage(phone, { type: "text", text: `Found:\n${lines.join("\n")}\n\nAsk your accountant via 'Contact RelaTax' for a specific one sent directly.` });
    return this.showMainMenu(phone);
  }

  // -- Notifications --------------------------------------------------------

  private async showNotifications(phone: string, userId: string) {
    const businesses = await this.businessesService.listForUser(userId);
    const notifications = await this.notificationsService.listForUser(
      userId,
      businesses.map((b) => b.id)
    );
    const unread = notifications.filter((n) => !n.readAt);

    if (unread.length === 0) {
      await this.transport.sendMessage(phone, { type: "text", text: "You're all caught up — no unread notifications." });
      return this.showMainMenu(phone);
    }

    const lines = unread.slice(0, 10).map((n) => `• ${n.title}: ${n.body}`);
    const businessIds = businesses.map((b) => b.id);
    await Promise.all(unread.map((n) => this.notificationsService.markRead(n.id, userId, businessIds)));
    await this.transport.sendMessage(phone, { type: "text", text: `Unread notifications:\n${lines.join("\n")}` });
    return this.showMainMenu(phone);
  }

  // -- AI ---------------------------------------------------------------------

  private async handleAiChat(phone: string, question: string, businessId?: string) {
    // Ground the answer in this client's actual current tax/document standing, not just
    // the knowledge base — same "current issues" context the portal assistant already gets.
    const extraFacts = businessId ? await this.businessFacts.buildBusinessFacts(businessId) : undefined;
    const result = await this.aiService.chat(question, { businessId, extraFacts });
    await this.transport.sendMessage(phone, { type: "text", text: result.answer });

    if (result.lowConfidence) {
      const session = await this.prisma.whatsAppSession.findUniqueOrThrow({ where: { phone } });
      return this.escalate(phone, session.userId!, businessId);
    }

    return this.transport.sendMessage(phone, {
      type: "text",
      text: "Ask another question, or type 'menu' to go back."
    });
  }

  // -- Escalation / consultation --------------------------------------------

  private async escalate(phone: string, userId: string, businessId?: string) {
    await this.prisma.whatsAppSession.update({ where: { phone }, data: { state: WhatsAppState.ESCALATION } });
    return this.transport.sendMessage(phone, {
      type: "list",
      text: "I'll connect you with the RelaTax team. What would you like?",
      options: [
        { id: "1", title: "Chat with consultant" },
        { id: "2", title: "Book consultation" },
        { id: "3", title: "Schedule callback" }
      ]
    });
  }

  private async handleEscalationChoice(phone: string, userId: string, choice: string, businessId?: string) {
    const labels: Record<string, string> = {
      "1": "Chat with consultant",
      "2": "Book consultation",
      "3": "Schedule callback"
    };
    const label = labels[choice];
    if (!label) {
      return this.transport.sendMessage(phone, { type: "text", text: "Please reply with 1, 2, or 3." });
    }

    await this.notificationsService.notifyStaff({
      type: NotificationType.ANNOUNCEMENT as any,
      channels: [NotificationChannel.PORTAL as any],
      title: `WhatsApp escalation: ${label}`,
      body: `Client requested "${label}" via WhatsApp (${phone})${businessId ? ` for business ${businessId}` : ""}.`
    });

    await this.transport.sendMessage(phone, {
      type: "text",
      text: `Got it — "${label}" has been sent to the RelaTax team. They'll reach out shortly.`
    });
    return this.showMainMenu(phone);
  }

  private async bookConsultation(phone: string) {
    await this.transport.sendMessage(phone, {
      type: "text",
      text: "You can book a consultation here: https://relatax.example.com/book-consultation — or reply 'menu' to go back."
    });
  }

  private async contactRelaTax(phone: string) {
    await this.transport.sendMessage(phone, {
      type: "text",
      text: "RelaTax — sethomoke25@gmail.com · +254 115 581 898 · Nairobi, Kenya. Reply 'menu' to go back."
    });
  }
}
