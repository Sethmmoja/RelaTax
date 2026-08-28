import { Injectable } from "@nestjs/common";
import { google, drive_v3 } from "googleapis";
import {
  CloudDriveBusinessContext,
  CloudDriveConnector,
  CloudDriveFile,
  CloudDriveTokens
} from "./cloud-drive-connector";

const SCOPES = ["https://www.googleapis.com/auth/drive.readonly"];
const REPORTS_FOLDER_NAME = "RelaTax Reports";
const FOLDER_MIME_TYPE = "application/vnd.google-apps.folder";

/**
 * Drive search terms are single-quoted, so a name containing a quote or
 * backslash would otherwise break the query — or let a business name chosen by
 * a user alter its meaning. Business names reach the query, so this is escaped
 * rather than interpolated raw.
 */
function escapeDriveQueryValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

/**
 * Real Google Drive connector (Phase 2). Uses a read-only scope only — rather
 * than requesting write access to create folders, it expects the folders to
 * already exist and simply resolves them. That keeps the OAuth consent screen
 * to a single low-sensitivity scope, avoiding Google's stricter app-verification
 * requirements for write/broad scopes.
 *
 * Folder layout is deliberately two levels deep:
 *
 *   RelaTax Reports/
 *     Acme Foods Ltd/      <- this business's files, and only this business's
 *     Zuri Logistics/
 *
 * Resolving a per-business subfolder rather than the shared parent is what lets
 * a single RelaTax Drive account serve every client: binding every business to
 * the top-level folder would import every client's documents into every other
 * client's account.
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

  /** Finds one folder by name, optionally within a specific parent. */
  private async findFolder(
    drive: drive_v3.Drive,
    name: string,
    parentId?: string
  ): Promise<drive_v3.Schema$File | undefined> {
    const clauses = [
      `name = '${escapeDriveQueryValue(name)}'`,
      `mimeType = '${FOLDER_MIME_TYPE}'`,
      "trashed = false"
    ];
    if (parentId) clauses.push(`'${escapeDriveQueryValue(parentId)}' in parents`);

    const { data } = await drive.files.list({
      q: clauses.join(" and "),
      fields: "files(id, name)",
      spaces: "drive"
    });
    return data.files?.[0];
  }

  async exchangeCodeForTokens(code: string, business: CloudDriveBusinessContext): Promise<CloudDriveTokens> {
    const client = this.buildClient();
    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);

    const drive = google.drive({ version: "v3", auth: client });

    const parent = await this.findFolder(drive, REPORTS_FOLDER_NAME);
    if (!parent?.id) {
      throw new Error(
        `No "${REPORTS_FOLDER_NAME}" folder found in this Google Drive account. Create a folder named exactly "${REPORTS_FOLDER_NAME}", then a subfolder inside it named exactly "${business.name}", and reconnect.`
      );
    }

    // Deliberately no fallback to the parent folder: silently binding this
    // business to the shared folder is exactly the cross-client leak this
    // layout exists to prevent, so an unconfigured business fails loudly.
    const businessFolder = await this.findFolder(drive, business.name, parent.id);
    if (!businessFolder?.id) {
      throw new Error(
        `No "${business.name}" subfolder found inside "${REPORTS_FOLDER_NAME}". Create a subfolder named exactly "${business.name}", put this client's files in it, then reconnect.`
      );
    }

    return {
      accessToken: tokens.access_token ?? "",
      refreshToken: tokens.refresh_token ?? "",
      expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : new Date(Date.now() + 60 * 60 * 1000),
      folderId: businessFolder.id,
      folderName: `${REPORTS_FOLDER_NAME}/${businessFolder.name ?? business.name}`
    };
  }

  async listFiles(folderId: string, accessToken: string): Promise<CloudDriveFile[]> {
    const client = this.buildClient();
    client.setCredentials({ access_token: accessToken });
    const drive = google.drive({ version: "v3", auth: client });

    const { data } = await drive.files.list({
      q: `'${escapeDriveQueryValue(folderId)}' in parents and trashed = false`,
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
