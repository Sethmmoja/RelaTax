import { Injectable, Logger } from "@nestjs/common";
import { OutboundMessage, WhatsAppTransport } from "./whatsapp-transport";

const GRAPH_API_VERSION = "v20.0";

/**
 * Real Meta WhatsApp Cloud API transport (Phase 2). Sends via the Graph API
 * using Node's built-in fetch — Meta has no official Node SDK for this API.
 * Activated when WHATSAPP_TRANSPORT=meta with WHATSAPP_ACCESS_TOKEN and
 * WHATSAPP_PHONE_NUMBER_ID set; see docs/architecture/whatsapp-flows.md for
 * how to obtain those from the Meta App Dashboard.
 */
@Injectable()
export class MetaWhatsAppTransport extends WhatsAppTransport {
  private readonly logger = new Logger(MetaWhatsAppTransport.name);

  async sendMessage(phone: string, message: OutboundMessage): Promise<void> {
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const token = process.env.WHATSAPP_ACCESS_TOKEN;
    const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/messages`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(this.toGraphPayload(phone, message))
    });

    if (!response.ok) {
      const body = await response.text();
      this.logger.error(`WhatsApp send failed (${response.status}): ${body}`);
      throw new Error(`WhatsApp Cloud API error: ${response.status}`);
    }
  }

  private toGraphPayload(phone: string, message: OutboundMessage) {
    const base = { messaging_product: "whatsapp", to: phone };

    if (message.type === "list" && message.options?.length) {
      return {
        ...base,
        type: "interactive",
        interactive: {
          type: "list",
          body: { text: message.text ?? "Please choose an option:" },
          action: {
            button: "Menu",
            sections: [
              {
                title: "Options",
                rows: message.options.map((option) => ({ id: option.id, title: option.title.slice(0, 24) }))
              }
            ]
          }
        }
      };
    }

    if (message.type === "document" && message.documentUrl) {
      return {
        ...base,
        type: "document",
        document: { link: message.documentUrl, filename: message.documentName ?? "document.pdf" }
      };
    }

    return { ...base, type: "text", text: { body: message.text ?? "" } };
  }
}
