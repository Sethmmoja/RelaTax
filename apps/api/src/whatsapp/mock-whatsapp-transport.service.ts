import { Injectable, Logger } from "@nestjs/common";
import { OutboundMessage, WhatsAppTransport } from "./whatsapp-transport";

const MAX_OUTBOX_PER_PHONE = 20;

@Injectable()
export class MockWhatsAppTransport extends WhatsAppTransport {
  private readonly logger = new Logger(MockWhatsAppTransport.name);
  private outbox = new Map<string, OutboundMessage[]>();

  async sendMessage(phone: string, message: OutboundMessage): Promise<void> {
    const existing = this.outbox.get(phone) ?? [];
    existing.push(message);
    if (existing.length > MAX_OUTBOX_PER_PHONE) existing.shift();
    this.outbox.set(phone, existing);

    this.logger.log(`[mock WhatsApp -> ${phone}] ${message.type}: ${message.text ?? message.documentUrl ?? ""}`);
  }

  getOutbox(phone: string): OutboundMessage[] {
    return this.outbox.get(phone) ?? [];
  }

  clearOutbox(phone: string): void {
    this.outbox.delete(phone);
  }
}
