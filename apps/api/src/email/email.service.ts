export interface EmailAttachment {
  filename: string;
  content: Buffer;
  contentType?: string;
}

export interface EmailMessage {
  to: string;
  subject: string;
  body: string;
  /** Optional HTML body — providers that support it render this instead of `body`. */
  html?: string;
  attachments?: EmailAttachment[];
}

/**
 * Swappable seam: Phase 1 ships MockEmailService (logs instead of sending).
 * Phase 2 swaps in a real transactional email provider (SES/Postmark/etc.)
 * behind this same interface — callers (AuthService) never change.
 */
export abstract class EmailService {
  abstract send(message: EmailMessage): Promise<void>;
}
