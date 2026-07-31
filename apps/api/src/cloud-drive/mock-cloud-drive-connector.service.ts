import { Injectable } from "@nestjs/common";
import { randomUUID } from "crypto";
import { CloudDriveConnector, CloudDriveFile, CloudDriveTokens } from "./cloud-drive-connector";

/**
 * Phase 1 mock: pretends a shared "RelaTax Reports" folder holds a few report
 * files. Each import run returns the same fixture set; the import job dedupes
 * by externalId so re-running is a no-op after the first import.
 */
@Injectable()
export class MockCloudDriveConnector extends CloudDriveConnector {
  get provider(): string {
    return "mock";
  }

  getAuthorizationUrl(businessId: string): string {
    return `https://drive.example.com/oauth?mock=true&state=${businessId}`;
  }

  async exchangeCodeForTokens(_code: string, businessId: string): Promise<CloudDriveTokens> {
    return {
      accessToken: `mock-drive-access-${randomUUID()}`,
      refreshToken: `mock-drive-refresh-${randomUUID()}`,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      // Stable per business so re-connecting doesn't re-import the same files,
      // matching how real Drive/Dropbox file ids persist across reconnects.
      folderId: `mock-folder-${businessId}`,
      folderName: "RelaTax Reports"
    };
  }

  async listFiles(folderId: string, _accessToken: string): Promise<CloudDriveFile[]> {
    // Stable ids per folder so re-imports dedupe correctly.
    const file = (name: string, mimeType: string, body: string): CloudDriveFile => ({
      externalId: `${folderId}:${name}`,
      name,
      mimeType,
      content: Buffer.from(body)
    });

    return [
      file("Profit-and-Loss-June-2026.pdf", "application/pdf", "mock P&L report contents"),
      file("Balance-Sheet-June-2026.pdf", "application/pdf", "mock balance sheet contents"),
      file("VAT-Return-June-2026.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "mock VAT workbook"),
      file("Bank-Statement-June-2026.pdf", "application/pdf", "mock supporting document")
    ];
  }
}
