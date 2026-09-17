import { Injectable, Logger } from "@nestjs/common";
import { NotificationChannel, NotificationType, RoleName } from "@relatax/types";
import { PrismaService } from "../prisma/prisma.service";
import { EmailService } from "../email/email.service";
import { WhatsAppTransport } from "../whatsapp/whatsapp-transport";
import { NotificationsService } from "../notifications/notifications.service";
import { CreateContactInquiryDto } from "./dto/create-contact-inquiry.dto";

// RelaTax's own contact details (footer/contact page) — not the submitter's.
const OWNER_EMAIL = "info@relatax.org";
const OWNER_WHATSAPP = "254115581898";

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private whatsAppTransport: WhatsAppTransport,
    private notificationsService: NotificationsService
  ) {}

  async create(dto: CreateContactInquiryDto) {
    const { website, formRenderedAt, ...fields } = dto;

    // Spam is answered exactly like a real inquiry — same status, same body,
    // same latency — so a bot author gets no signal about which field gave
    // them away. Nothing is stored and nobody is notified.
    if (isProbablySpam(website, formRenderedAt)) {
      this.logger.warn(`Dropped a contact inquiry that tripped the bot trap (${website ? "honeypot" : "time"})`);
      return { received: true };
    }

    const inquiry = await this.prisma.contactInquiry.create({ data: fields });

    const summary = [
      `New contact inquiry from ${dto.name} (${dto.company})`,
      `Sector: ${dto.sector}`,
      `Email: ${dto.email}${dto.phone ? ` · Phone: ${dto.phone}` : ""}`,
      `Interested in: ${dto.services.join(", ")}`,
      dto.message ? `Message: ${dto.message}` : null
    ]
      .filter(Boolean)
      .join("\n");

    try {
      await this.emailService.send({
        to: OWNER_EMAIL,
        subject: `New contact inquiry — ${dto.company}`,
        body: summary
      });
    } catch (error) {
      this.logger.error(`Failed to email contact inquiry ${inquiry.id}: ${(error as Error).message}`);
    }

    try {
      await this.whatsAppTransport.sendMessage(OWNER_WHATSAPP, { type: "text", text: summary });
    } catch (error) {
      this.logger.error(`Failed to WhatsApp contact inquiry ${inquiry.id}: ${(error as Error).message}`);
    }

    const superAdmins = await this.prisma.user.findMany({
      where: { roleAssignments: { some: { role: { name: RoleName.SUPER_ADMIN } } } },
      select: { id: true }
    });
    await Promise.all(
      superAdmins.map((admin) =>
        this.notificationsService.notifyUser(admin.id, {
          type: NotificationType.ANNOUNCEMENT,
          channels: [NotificationChannel.PORTAL],
          title: `New contact inquiry — ${dto.company}`,
          body: summary
        })
      )
    );

    return { received: true };
  }

  async listAll() {
    return this.prisma.contactInquiry.findMany({ orderBy: { createdAt: "desc" } });
  }
}

const MIN_HUMAN_FILL_MS = 3_000;

function isProbablySpam(honeypot: string | undefined, renderedAt: number | undefined): boolean {
  if (honeypot && honeypot.trim().length > 0) return true;
  // Only trust a plausible timestamp: a bot that omits or fakes the field
  // still has to clear the honeypot, and an honest old tab isn't punished.
  if (typeof renderedAt === "number" && renderedAt > 0 && renderedAt <= Date.now()) {
    return Date.now() - renderedAt < MIN_HUMAN_FILL_MS;
  }
  return false;
}
