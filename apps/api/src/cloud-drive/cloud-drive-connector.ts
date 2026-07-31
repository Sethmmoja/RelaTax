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
 * Swappable seam: Phase 1 ships MockCloudDriveConnector (fixture files, no
 * network calls). Phase 2 swaps in a real Google Drive / Dropbox connector
 * calling that provider's API — CloudDriveService and the import processor
 * don't change. Selected by the CLOUD_DRIVE_CONNECTOR env var.
 */
export abstract class CloudDriveConnector {
  abstract get provider(): string;
  abstract getAuthorizationUrl(businessId: string): string;
  abstract exchangeCodeForTokens(code: string, businessId: string): Promise<CloudDriveTokens>;
  abstract listFiles(folderId: string, accessToken: string): Promise<CloudDriveFile[]>;
}
