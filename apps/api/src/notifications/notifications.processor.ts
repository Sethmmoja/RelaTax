import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { NotificationChannel } from "@relatax/types";
import { PrismaService } from "../prisma/prisma.service";
import { EmailService } from "../email/email.service";
import { WhatsAppTransport } from "../whatsapp/whatsapp-transport";

/**
 * PORTAL "delivery" is implicit — the portal reads Notification rows directly.
 * EMAIL/WHATSAPP call the real (or mock, depending on env config) transports
 * directly — see EmailModule/WhatsAppTransportModule for the swappable seam.
 */
@Processor("notifications")
export class NotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationsProcessor.name);

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private whatsAppTransport: WhatsAppTransport
  ) {
    super();
  }

  async process(job: Job<{ notificationId: string }>): Promise<void> {
    const notification = await this.prisma.notification.findUnique({
      where: { id: job.data.notificationId }
    });
    if (!notification) return;

    const recipients = notification.userId
      ? [await this.prisma.user.findUnique({ where: { id: notification.userId } })]
      : notification.businessId
        ? (
            await this.prisma.businessMember.findMany({
              where: { businessId: notification.businessId },
              include: { user: true }
            })
          ).map((m) => m.user)
        : [];

    const users = recipients.filter((u): u is NonNullable<typeof u> => !!u);

    for (const channel of notification.channels as NotificationChannel[]) {
      if (channel === NotificationChannel.PORTAL) continue;

      for (const user of users) {
        try {
          if (channel === NotificationChannel.EMAIL) {
            await this.emailService.send({ to: user.email, subject: notification.title, body: notification.body });
          } else if (channel === NotificationChannel.WHATSAPP) {
            if (!user.phone) {
              this.logger.warn(`Skipping WhatsApp delivery to user=${user.id}: no phone on file`);
              continue;
            }
            await this.whatsAppTransport.sendMessage(user.phone, {
              type: "text",
              text: `${notification.title}\n\n${notification.body}`
            });
          }
        } catch (error) {
          // One recipient's bad email/phone shouldn't fail delivery to everyone else.
          this.logger.error(`Failed to deliver ${channel} to user=${user.id}: ${(error as Error).message}`);
        }
      }
    }
  }
}
