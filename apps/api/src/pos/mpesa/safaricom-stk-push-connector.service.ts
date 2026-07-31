import { Injectable, Logger } from "@nestjs/common";
import { StkPushConnector, StkPushRequest, StkPushResult } from "./stk-push-connector";

interface CachedToken {
  accessToken: string;
  expiresAt: number;
}

/**
 * Real Safaricom Daraja STK Push (Lipa Na M-Pesa Online) integration.
 * Written against the documented Daraja API contract and ready to use, but
 * left dormant behind MPESA_CONNECTOR=mock (default) — this environment has
 * no real Daraja sandbox/production credentials to test against, same
 * situation as MetaWhatsAppTransport before Meta app access was available.
 */
@Injectable()
export class SafaricomStkPushConnector extends StkPushConnector {
  private readonly logger = new Logger(SafaricomStkPushConnector.name);
  private tokenCache = new Map<string, CachedToken>();

  private baseUrl(environment: string): string {
    return environment === "production" ? "https://api.safaricom.co.ke" : "https://sandbox.safaricom.co.ke";
  }

  private async getAccessToken(consumerKey: string, consumerSecret: string, environment: string): Promise<string> {
    const cacheKey = `${environment}:${consumerKey}`;
    const cached = this.tokenCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.accessToken;

    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");
    const res = await fetch(`${this.baseUrl(environment)}/oauth/v1/generate?grant_type=client_credentials`, {
      headers: { Authorization: `Basic ${auth}` }
    });
    if (!res.ok) {
      throw new Error(`Daraja OAuth token request failed: ${res.status} ${await res.text()}`);
    }
    const body = (await res.json()) as { access_token: string; expires_in: string };

    // Refresh a minute early to avoid a request landing right on expiry.
    const expiresAt = Date.now() + (Number(body.expires_in) - 60) * 1000;
    this.tokenCache.set(cacheKey, { accessToken: body.access_token, expiresAt });
    return body.access_token;
  }

  private timestamp(): string {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  }

  async initiate(request: StkPushRequest): Promise<StkPushResult> {
    const accessToken = await this.getAccessToken(request.consumerKey, request.consumerSecret, request.environment);
    const timestamp = this.timestamp();
    const password = Buffer.from(`${request.businessShortCode}${request.passkey}${timestamp}`).toString("base64");

    const res = await fetch(`${this.baseUrl(request.environment)}/mpesa/stkpush/v1/processrequest`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        BusinessShortCode: request.businessShortCode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline",
        Amount: Math.round(request.amount),
        PartyA: request.phoneNumber,
        PartyB: request.businessShortCode,
        PhoneNumber: request.phoneNumber,
        CallBackURL: request.callbackUrl,
        AccountReference: request.accountReference,
        TransactionDesc: request.transactionDesc
      })
    });

    const body = (await res.json()) as {
      MerchantRequestID?: string;
      CheckoutRequestID?: string;
      ResponseCode?: string;
      ResponseDescription?: string;
      errorMessage?: string;
    };

    if (!res.ok || !body.CheckoutRequestID) {
      const message = body.errorMessage ?? body.ResponseDescription ?? `HTTP ${res.status}`;
      this.logger.error(`STK push initiate failed for ${request.phoneNumber}: ${message}`);
      throw new Error(`M-Pesa STK push failed: ${message}`);
    }

    return {
      merchantRequestId: body.MerchantRequestID!,
      checkoutRequestId: body.CheckoutRequestID,
      responseCode: body.ResponseCode ?? "0",
      responseDescription: body.ResponseDescription ?? ""
    };
  }
}
