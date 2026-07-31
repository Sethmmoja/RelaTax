export interface QuickBooksReportFixture {
  type: "PROFIT_AND_LOSS" | "BALANCE_SHEET" | "TRIAL_BALANCE";
  periodLabel: string;
  periodStart: string;
  periodEnd: string;
}

/**
 * Swappable seam: Phase 1 ships MockQuickBooksConnector (fixture data, no
 * network calls). Phase 2 swaps in IntuitQuickBooksConnector calling the real
 * QuickBooks Online API — QuickBooksService and the sync processor don't change.
 */
export abstract class QuickBooksConnector {
  abstract getAuthorizationUrl(businessId: string): string;
  abstract exchangeCodeForTokens(code: string): Promise<{ accessToken: string; refreshToken: string; realmId: string; expiresAt: Date }>;
  abstract fetchReports(realmId: string, accessToken: string): Promise<QuickBooksReportFixture[]>;
}
