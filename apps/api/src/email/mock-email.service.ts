import { Injectable, Logger } from "@nestjs/common";
import { EmailMessage, EmailService } from "./email.service";

@Injectable()
export class MockEmailService extends EmailService {
  private readonly logger = new Logger(MockEmailService.name);

  async send(message: EmailMessage): Promise<void> {
    const attachmentNote = message.attachments?.length
      ? ` (attachments: ${message.attachments.map((a) => a.filename).join(", ")})`
      : "";
    this.logger.log(`[mock email -> ${message.to}] ${message.subject}${attachmentNote}\n${message.body}`);
  }
}
