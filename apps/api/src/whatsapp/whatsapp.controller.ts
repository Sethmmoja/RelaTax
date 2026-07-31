import { BadRequestException, Body, Controller, Get, Logger, Param, Post, Query, RawBodyRequest, Req } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { SkipThrottle } from "@nestjs/throttler";
import type { Request } from "express";
import { Public } from "../common/decorators/public.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { AuthenticatedUser } from "../auth/auth.types";
import { ReportsService } from "../reports/reports.service";
import { WhatsAppConversationEngine } from "./whatsapp-conversation.engine";
import { WhatsAppTransport } from "./whatsapp-transport";
import { MockWhatsAppTransport } from "./mock-whatsapp-transport.service";
import { SimulateInboundDto } from "./dto/simulate-inbound.dto";
import { verifyMetaSignature } from "./verify-meta-signature";

@ApiTags("whatsapp")
@Controller("whatsapp")
export class WhatsAppController {
  private readonly logger = new Logger(WhatsAppController.name);

  constructor(
    private engine: WhatsAppConversationEngine,
    private mockTransport: MockWhatsAppTransport,
    private transport: WhatsAppTransport,
    private reportsService: ReportsService
  ) {}

  /** Meta's webhook verification handshake. */
  @Public()
  @Get("webhook")
  verify(
    @Query("hub.mode") mode: string,
    @Query("hub.verify_token") token: string,
    @Query("hub.challenge") challenge: string
  ) {
    if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
      return challenge;
    }
    return { error: "verification failed" };
  }

  /**
   * Real Meta Cloud API inbound messages land here. Signature-verified when
   * WHATSAPP_TRANSPORT=meta — that check is the real gate, so this skips the
   * global per-IP throttle rather than risk dropping legitimate webhook
   * traffic from Meta's shared IP pool during a busy period.
   */
  @Public()
  @SkipThrottle()
  @Post("webhook")
  async webhook(@Body() body: any, @Req() req: RawBodyRequest<Request>) {
    if (process.env.WHATSAPP_TRANSPORT === "meta") {
      const signature = req.headers["x-hub-signature-256"] as string | undefined;
      const valid = verifyMetaSignature(req.rawBody, signature, process.env.WHATSAPP_APP_SECRET ?? "");
      if (!valid) {
        this.logger.warn("Rejected WhatsApp webhook with an invalid or missing signature");
        return { received: false };
      }
    }

    const entry = body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    if (entry?.from && entry?.text?.body) {
      await this.engine.handleInbound(entry.from, entry.text.body);
    }
    return { received: true };
  }

  /**
   * Dev-only endpoint: drives the conversation engine directly, without a real
   * WhatsApp number, and returns the engine's replies so the whole flow is
   * demonstrable/testable. Disabled once WHATSAPP_TRANSPORT=meta.
   */
  @Public()
  @Post("simulate-inbound")
  async simulateInbound(@Body() dto: SimulateInboundDto) {
    if (process.env.WHATSAPP_TRANSPORT === "meta") {
      return { error: "simulate-inbound is disabled when WHATSAPP_TRANSPORT=meta" };
    }
    this.mockTransport.clearOutbox(dto.phone);
    await this.engine.handleInbound(dto.phone, dto.message);
    return { replies: this.mockTransport.getOutbox(dto.phone) };
  }

  /**
   * The client portal's "Send to WhatsApp" button — delivers a specific
   * report to the signed-in user's own registered phone, in one click.
   * Reuses ReportsService.exportReport for both the ownership check and the
   * signed download URL, so a client can never trigger a send for a report
   * belonging to another business.
   */
  @ApiBearerAuth()
  @Post("reports/:reportId/send")
  async sendReportToWhatsApp(
    @Param("reportId") reportId: string,
    @Query("format") format: "pdf" | "xlsx" = "pdf",
    @CurrentUser() user: AuthenticatedUser
  ) {
    if (!user.phone) {
      throw new BadRequestException("Add and verify a phone number in Settings before sending reports to WhatsApp.");
    }

    const { url } = await this.reportsService.exportReport(reportId, format, user);
    if (!url) throw new BadRequestException("Could not generate a downloadable file for this report.");

    await this.transport.sendMessage(user.phone, {
      type: "document",
      text: "Here's the report you requested from your RelaTax portal.",
      documentUrl: url,
      documentName: `report.${format}`
    });

    return { sent: true, phone: user.phone };
  }

  /**
   * Dev-only: inspect what the mock transport "sent" to a phone, so the
   * send-to-WhatsApp button (and any other flow) can be verified without a
   * real WhatsApp number. Disabled once WHATSAPP_TRANSPORT=meta.
   */
  @Public()
  @Get("outbox/:phone")
  peekOutbox(@Param("phone") phone: string) {
    if (process.env.WHATSAPP_TRANSPORT === "meta") {
      return { error: "outbox inspection is disabled when WHATSAPP_TRANSPORT=meta" };
    }
    return { messages: this.mockTransport.getOutbox(phone) };
  }
}
