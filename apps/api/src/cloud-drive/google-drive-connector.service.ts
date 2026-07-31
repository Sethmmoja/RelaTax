import { Injectable } from "@nestjs/common";
import { google } from "googleapis";
import { CloudDriveConnector, CloudDriveFile, CloudDriveTokens } from "./cloud-drive-connector";

const SCOPES = ["https://www.googleapis.com/auth/drive.readonly"];
const REPORTS_FOLDER_NAME = "RelaTax Reports";

/**
 * Real Google Drive connector (Phase 2). Uses a read-only scope only — rather
 * than requesting write access to create a folder, it expects the client to
 * create a folder named exactly "RelaTax Reports" in their own Drive and drop
 * report files into it. This keeps the OAuth consent screen to a single
 * low-sensitivity scope, which avoids Google's stricter app-verification
 * requirements for write/broad scopes.
 */
@Injectable()
export class GoogleDriveConnector extends CloudDriveConnector {
  get provider(): string {
    return "google_drive";
  }

  private get redirectUri(): string {
    return `${process.env.API_BASE_URL ?? "http://localhost:4000"}/api/v1/cloud-drive/callback`;
  }

  private buildClient() {
    return new google.auth.OAuth2(
      process.env.CLOUD_DRIVE_CLIENT_ID,
      process.env.CLOUD_DRIVE_CLIENT_SECRET,
      this.redirectUri
    );
  }

  getAuthorizationUrl(businessId: string): string {
    return this.buildClient().generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: SCOPES,
      state: businessId
    });
  }

  async exchangeCodeForTokens(code: string, _businessId: string): Promise<CloudDriveTokens> {
    const client = this.buildClient();
    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);

    const drive = google.drive({ version: "v3", auth: client });
    const search = await drive.files.list({
      q: `name = '${REPORTS_FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: "files(id, name)",
      spaces: "drive"
    });

    const folder = search.data.files?.[0];
    if (!folder?.id) {
      throw new Error(
        `No "${REPORTS_FOLDER_NAME}" folder found in this Google Drive account. Create a folder named exactly "${REPORTS_FOLDER_NAME}", add the report files to it, then reconnect.`
      );
    }

    return {
      accessToken: tokens.access_token ?? "",
      refreshToken: tokens.refresh_token ?? "",
      expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : new Date(Date.now() + 60 * 60 * 1000),
      folderId: folder.id,
      folderName: folder.name ?? REPORTS_FOLDER_NAME
    };
  }

  async listFiles(folderId: string, accessToken: string): Promise<CloudDriveFile[]> {
    const client = this.buildClient();
    client.setCredentials({ access_token: accessToken });
    const drive = google.drive({ version: "v3", auth: client });

    const { data } = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: "files(id, name, mimeType)",
      spaces: "drive"
    });

    const files: CloudDriveFile[] = [];
    for (const file of data.files ?? []) {
      if (!file.id || !file.name) continue;

      const isGoogleNative = file.mimeType?.startsWith("application/vnd.google-apps");
      if (isGoogleNative && file.mimeType === "application/vnd.google-apps.folder") continue;

      if (isGoogleNative) {
        const exportMimeType =
          file.mimeType === "application/vnd.google-apps.spreadsheet"
            ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            : "application/pdf";
        const res = await drive.files.export(
          { fileId: file.id, mimeType: exportMimeType },
          { responseType: "arraybuffer" }
        );
        files.push({
          externalId: file.id,
          name: file.name,
          mimeType: exportMimeType,
          content: Buffer.from(res.data as ArrayBuffer)
        });
      } else {
        const res = await drive.files.get({ fileId: file.id, alt: "media" }, { responseType: "arraybuffer" });
        files.push({
          externalId: file.id,
          name: file.name,
          mimeType: file.mimeType ?? "application/octet-stream",
          content: Buffer.from(res.data as ArrayBuffer)
        });
      }
    }

    return files;
  }
}
