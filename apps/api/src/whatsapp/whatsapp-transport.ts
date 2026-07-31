export interface OutboundMessage {
  type: "text" | "list" | "document";
  text?: string;
  options?: { id: string; title: string }[];
  documentUrl?: string | null;
  documentName?: string;
}

/**
 * Swappable seam: Phase 1 ships MockWhatsAppTransport (logs + in-memory outbox
 * for the dev simulate-inbound endpoint). Phase 2 swaps in the real Meta Cloud
 * API client behind this same interface — the conversation engine never changes.
 */
export abstract class WhatsAppTransport {
  abstract sendMessage(phone: string, message: OutboundMessage): Promise<void>;
}
