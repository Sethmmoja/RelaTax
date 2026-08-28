import { InjectQueue } from "@nestjs/bullmq";
import { Injectable, NotFoundException } from "@nestjs/common";
import { Queue } from "bullmq";
import { SyncStatus } from "@relatax/types";
import { PrismaService } from "../prisma/prisma.service";
import { DocumentsService } from "../documents/documents.service";
import { CloudDriveConnector } from "./cloud-drive-connector";
import { inferDocumentType } from "./infer-document-type";

@Injectable()
export class CloudDriveService {
  constructor(
    private prisma: PrismaService,
    private connector: CloudDriveConnector,
    private documentsService: DocumentsService,
    @InjectQueue("cloud-drive-import") private importQueue: Queue
  ) {}

  /** Mock connections use fabricated tokens with nothing sensitive to protect — the real
   *  connector's callback must never echo tokens back to the browser (see controller). */
  get isMock(): boolean {
    return this.connector.provider === "mock";
  }

  getAuthorizationUrl(businessId: string): string {
    return this.connector.getAuthorizationUrl(businessId);
  }

  async getConnection(businessId: string) {
    const connection = await this.prisma.cloudDriveConnection.findUnique({
      where: { businessId },
      select: { id: true, provider: true, folderName: true, lastSyncedAt: true, createdAt: true }
    });
    return { connected: !!connection, connection };
  }

  async handleCallback(businessId: string, code: string) {
    // The connector resolves a folder named after the business, so it needs the
    // name, not just the id.
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { id: true, name: true }
    });
    if (!business) throw new NotFoundException("Business not found");

    const tokens = await this.connector.exchangeCodeForTokens(code, business);

    const connection = await this.prisma.cloudDriveConnection.upsert({
      where: { businessId },
      create: {
        businessId,
        provider: this.connector.provider,
        folderId: tokens.folderId,
        folderName: tokens.folderName,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt
      },
      update: {
        provider: this.connector.provider,
        folderId: tokens.folderId,
        folderName: tokens.folderName,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt
      }
    });

    return connection;
  }

  async triggerImport(businessId: string, triggeredByUserId: string) {
    const connection = await this.prisma.cloudDriveConnection.findUnique({ where: { businessId } });
    if (!connection) throw new NotFoundException("No cloud drive connection for this business");

    await this.importQueue.add("import", { businessId, connectionId: connection.id, triggeredByUserId });
    return { queued: true };
  }

  async runImport(businessId: string, connectionId: string, triggeredByUserId: string) {
    const connection = await this.prisma.cloudDriveConnection.findUniqueOrThrow({ where: { id: connectionId } });
    const log = await this.prisma.syncLog.create({
      data: { businessId, source: "cloud_drive", status: SyncStatus.RUNNING as any }
    });

    try {
      const files = await this.connector.listFiles(connection.folderId ?? "", connection.accessToken);
      let imported = 0;

      for (const file of files) {
        const existing = await this.prisma.document.findUnique({ where: { externalFileId: file.externalId } });
        if (existing) continue;

        const { category, reportType } = inferDocumentType(file.name);
        await this.documentsService.upload({
          businessId,
          uploadedById: triggeredByUserId,
          category,
          reportType,
          originalName: file.name,
          mimeType: file.mimeType,
          buffer: file.content,
          externalFileId: file.externalId
        });
        imported += 1;
      }

      await this.prisma.cloudDriveConnection.update({
        where: { id: connectionId },
        data: { lastSyncedAt: new Date() }
      });

      await this.prisma.syncLog.update({
        where: { id: log.id },
        data: { status: SyncStatus.SUCCESS as any, finishedAt: new Date(), recordsUpserted: imported }
      });
    } catch (error) {
      await this.prisma.syncLog.update({
        where: { id: log.id },
        data: { status: SyncStatus.FAILED as any, finishedAt: new Date(), error: (error as Error).message }
      });
      throw error;
    }
  }

  async listImportLogs(businessId: string) {
    return this.prisma.syncLog.findMany({
      where: { businessId, source: "cloud_drive" },
      orderBy: { startedAt: "desc" },
      take: 20
    });
  }
}
