import { InjectQueue } from "@nestjs/bullmq";
import { Injectable, NotFoundException } from "@nestjs/common";
import { Queue } from "bullmq";
import { ReportSource, ReportType, SyncStatus } from "@relatax/types";
import { PrismaService } from "../prisma/prisma.service";
import { QuickBooksConnector } from "./quickbooks-connector";
import { MockQuickBooksConnector } from "./mock-quickbooks-connector.service";

const REPORT_TYPE_MAP: Record<string, ReportType> = {
  PROFIT_AND_LOSS: ReportType.PROFIT_AND_LOSS,
  BALANCE_SHEET: ReportType.BALANCE_SHEET,
  TRIAL_BALANCE: ReportType.TRIAL_BALANCE
};

@Injectable()
export class QuickBooksService {
  constructor(
    private prisma: PrismaService,
    private connector: QuickBooksConnector,
    @InjectQueue("quickbooks-sync") private syncQueue: Queue
  ) {}

  /** Mock connections use fabricated tokens with nothing sensitive to protect — the real
   *  connector's callback must never echo tokens back to the browser (see controller). */
  get isMock(): boolean {
    return this.connector instanceof MockQuickBooksConnector;
  }

  getAuthorizationUrl(businessId: string): string {
    return this.connector.getAuthorizationUrl(businessId);
  }

  async getConnection(businessId: string) {
    const connection = await this.prisma.quickBooksConnection.findUnique({
      where: { businessId },
      select: { id: true, realmId: true, lastSyncedAt: true, expiresAt: true, createdAt: true }
    });
    return { connected: !!connection, connection };
  }

  async handleCallback(businessId: string, code: string) {
    const tokens = await this.connector.exchangeCodeForTokens(code);

    const connection = await this.prisma.quickBooksConnection.upsert({
      where: { businessId },
      create: {
        businessId,
        realmId: tokens.realmId,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt
      },
      update: {
        realmId: tokens.realmId,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt
      }
    });

    await this.syncQueue.add("sync", { businessId, connectionId: connection.id });
    return connection;
  }

  async triggerSync(businessId: string) {
    const connection = await this.prisma.quickBooksConnection.findUnique({ where: { businessId } });
    if (!connection) throw new NotFoundException("No QuickBooks connection for this business");

    await this.syncQueue.add("sync", { businessId, connectionId: connection.id });
    return { queued: true };
  }

  async runSync(businessId: string, connectionId: string) {
    const connection = await this.prisma.quickBooksConnection.findUniqueOrThrow({ where: { id: connectionId } });
    const syncLog = await this.prisma.syncLog.create({
      data: { businessId, status: SyncStatus.RUNNING as any, quickBooksConnId: connectionId }
    });

    try {
      const reports = await this.connector.fetchReports(connection.realmId, connection.accessToken);
      let upserted = 0;

      for (const report of reports) {
        const period = await this.prisma.reportPeriod.upsert({
          where: { id: `${businessId}-${report.periodLabel}` },
          create: {
            id: `${businessId}-${report.periodLabel}`,
            businessId,
            label: report.periodLabel,
            startDate: new Date(report.periodStart),
            endDate: new Date(report.periodEnd)
          },
          update: {}
        });

        await this.prisma.financialReport.upsert({
          where: { id: `${period.id}-${report.type}` },
          create: {
            id: `${period.id}-${report.type}`,
            periodId: period.id,
            type: REPORT_TYPE_MAP[report.type] as any,
            source: ReportSource.QUICKBOOKS as any
          },
          update: { source: ReportSource.QUICKBOOKS as any }
        });
        upserted += 1;
      }

      await this.prisma.quickBooksConnection.update({
        where: { id: connectionId },
        data: { lastSyncedAt: new Date() }
      });

      await this.prisma.syncLog.update({
        where: { id: syncLog.id },
        data: { status: SyncStatus.SUCCESS as any, finishedAt: new Date(), recordsUpserted: upserted }
      });
    } catch (error) {
      await this.prisma.syncLog.update({
        where: { id: syncLog.id },
        data: { status: SyncStatus.FAILED as any, finishedAt: new Date(), error: (error as Error).message }
      });
      throw error;
    }
  }

  async listSyncLogs(businessId: string) {
    return this.prisma.syncLog.findMany({ where: { businessId }, orderBy: { startedAt: "desc" }, take: 20 });
  }
}
