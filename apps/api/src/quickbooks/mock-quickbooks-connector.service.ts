import { Injectable } from "@nestjs/common";
import { randomUUID } from "crypto";
import { QuickBooksConnector, QuickBooksReportFixture } from "./quickbooks-connector";

@Injectable()
export class MockQuickBooksConnector extends QuickBooksConnector {
  getAuthorizationUrl(businessId: string): string {
    return `https://appcenter.intuit.com/connect/oauth2?mock=true&state=${businessId}`;
  }

  async exchangeCodeForTokens(_code: string) {
    return {
      accessToken: `mock-access-${randomUUID()}`,
      refreshToken: `mock-refresh-${randomUUID()}`,
      realmId: `mock-realm-${randomUUID().slice(0, 8)}`,
      expiresAt: new Date(Date.now() + 55 * 60 * 1000)
    };
  }

  async fetchReports(_realmId: string, _accessToken: string): Promise<QuickBooksReportFixture[]> {
    const now = new Date();
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));
    const label = start.toLocaleString("en-US", { month: "long", year: "numeric" });

    return [
      { type: "PROFIT_AND_LOSS", periodLabel: label, periodStart: start.toISOString(), periodEnd: end.toISOString() },
      { type: "BALANCE_SHEET", periodLabel: label, periodStart: start.toISOString(), periodEnd: end.toISOString() },
      { type: "TRIAL_BALANCE", periodLabel: label, periodStart: start.toISOString(), periodEnd: end.toISOString() }
    ];
  }
}
