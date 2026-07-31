import { Injectable, Logger } from "@nestjs/common";
import nodemailer, { Transporter } from "nodemailer";
import { EmailMessage, EmailService } from "./email.service";

/**
 * Real transactional email over SMTP (Phase 2). Generic SMTP works unchanged
 * against most providers (SES SMTP interface, SendGrid, Postmark, Mailgun,
 * Gmail with an app password) — only the env vars change, not this code.
 */
@Injectable()
export class SmtpEmailService extends EmailService {
  private readonly logger = new Logger(SmtpEmailService.name);
  private transporterInstance?: Transporter;

  private get transporter(): Transporter {
    if (!this.transporterInstance) {
      this.transporterInstance = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT ?? 587),
        secure: process.env.SMTP_SECURE === "true",
        auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined
      });
    }
    return this.transporterInstance;
  }

  async send(message: EmailMessage): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM ?? "RelaTax <no-reply@relatax.co.ke>",
        to: message.to,
        subject: message.subject,
        text: message.body,
        html: message.html,
        attachments: message.attachments?.map((a) => ({
          filename: a.filename,
          content: a.content,
          contentType: a.contentType
        }))
      });
    } catch (error) {
      this.logger.error(`Failed to send email to ${message.to}: ${(error as Error).message}`);
      throw error;
    }
  }
}
