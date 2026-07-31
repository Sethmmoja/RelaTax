export interface StkPushRequest {
  businessShortCode: string;
  passkey: string;
  consumerKey: string;
  consumerSecret: string;
  environment: string; // "sandbox" | "production"
  amount: number;
  /** MSISDN format, e.g. 2547XXXXXXXX */
  phoneNumber: string;
  accountReference: string;
  transactionDesc: string;
  callbackUrl: string;
}

export interface StkPushResult {
  merchantRequestId: string;
  checkoutRequestId: string;
  responseCode: string;
  responseDescription: string;
}

/**
 * Swappable seam: Phase 1 ships MockStkPushConnector (returns a fake
 * checkoutRequestId immediately; "payment succeeds" is simulated separately
 * via the dev-only /mpesa/simulate-callback endpoint, not by this connector).
 * SafaricomStkPushConnector calls the real Daraja API behind this same
 * interface — SalesService never changes. Real activation needs each
 * business's own Daraja app credentials (stored in MpesaConnection), which
 * this environment doesn't have — same situation as MetaWhatsAppTransport.
 */
export abstract class StkPushConnector {
  abstract initiate(request: StkPushRequest): Promise<StkPushResult>;
}
