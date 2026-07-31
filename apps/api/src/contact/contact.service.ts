import { Injectable, Logger } from "@nestjs/common";
import { NotificationChannel, NotificationType, RoleName } from "@relatax/types";
import { PrismaService } from "../prisma/prisma.service";
import { EmailService } from "../email/email.service";
import { WhatsAppTransport } from "../whatsapp/whatsapp-transport";
import { NotificationsService } from "../notifications/notifications.service";
import { CreateContactInquiryDto } from "./dto/create-contact-inquiry.dto";

// RelaTax's own contact details (footer/contact page) — not the submitter's.
const OWNER_EMAIL = "sethomoke25@gmail.com";
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
    const inquiry = await this.prisma.contactInquiry.create({ data: dto });

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
