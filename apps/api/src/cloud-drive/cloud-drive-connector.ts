export interface CloudDriveFile {
  /** Provider-native file id — used to skip files already imported. */
  externalId: string;
  name: string;
  mimeType: string;
  content: Buffer;
}

export interface CloudDriveTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  folderId: string;
  folderName: string;
}

/**
 * The business a connection is being made for. The name matters as well as the
 * id: one RelaTax Drive account can serve every client, so the connector has to
 * resolve a folder specific to this business rather than a single shared one.
 */
export interface CloudDriveBusinessContext {
  id: string;
  name: string;
}

/**
 * Swappable seam: Phase 1 ships MockCloudDriveConnector (fixture files, no
 * network calls). Phase 2 swaps in a real Google Drive / Dropbox connector
 * calling that provider's API — CloudDriveService and the import processor
 * don't change. Selected by the CLOUD_DRIVE_CONNECTOR env var.
 */
export abstract class CloudDriveConnector {
  abstract get provider(): string;
  abstract getAuthorizationUrl(businessId: string): string;
  abstract exchangeCodeForTokens(code: string, business: CloudDriveBusinessContext): Promise<CloudDriveTokens>;
  abstract listFiles(folderId: string, accessToken: string): Promise<CloudDriveFile[]>;
}
