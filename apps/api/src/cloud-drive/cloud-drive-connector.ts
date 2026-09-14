export interface CloudDriveFile {
  /** Provider-native file id — used to skip files already imported. */
  externalId: string;
  name: string;
  mimeType: string;
  content: Buffer;
}

/** What a connection stores to call the provider on the business's behalf. */
export interface CloudDriveCredentials {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

export interface CloudDriveTokens extends CloudDriveCredentials {
  folderId: string;
  folderName: string;
}

export interface CloudDriveListing {
  files: CloudDriveFile[];
  /**
   * Set when the provider issued a new access token during the call. Access
   * tokens are short-lived (Google's last an hour), so anything that reads
   * from the drive must be prepared to persist these — otherwise every import
   * after the first hour fails with "Invalid Credentials".
   */
  refreshedCredentials?: CloudDriveCredentials;
}

/** Thrown when the refresh token itself is rejected — only a reconnect can fix that. */
export class CloudDriveReauthorizationRequiredError extends Error {
  constructor(provider: string) {
    super(`${provider} access has expired or been revoked. Reconnect this business's drive to continue importing.`);
    this.name = "CloudDriveReauthorizationRequiredError";
  }
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
  abstract listFiles(folderId: string, credentials: CloudDriveCredentials): Promise<CloudDriveListing>;
}
