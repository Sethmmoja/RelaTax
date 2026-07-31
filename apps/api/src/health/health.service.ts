import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import Redis from "ioredis";
import { PrismaService } from "../prisma/prisma.service";

interface CheckResult {
  ok: boolean;
  error?: string;
}

export interface HealthReport {
  status: "ok" | "degraded";
  db: CheckResult;
  redis: CheckResult;
  timestamp: string;
}

@Injectable()
export class HealthService implements OnModuleDestroy {
  private readonly logger = new Logger(HealthService.name);
  private readonly redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    retryStrategy: () => null
  });

  constructor(private prisma: PrismaService) {}

  async check(): Promise<HealthReport> {
    const [db, redis] = await Promise.all([this.checkDb(), this.checkRedis()]);
    return {
      status: db.ok && redis.ok ? "ok" : "degraded",
      db,
      redis,
      timestamp: new Date().toISOString()
    };
  }

  private async checkDb(): Promise<CheckResult> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { ok: true };
    } catch (error) {
      this.logger.error(`DB health check failed: ${(error as Error).message}`);
      return { ok: false, error: (error as Error).message };
    }
  }

  private async checkRedis(): Promise<CheckResult> {
    try {
      await this.redis.ping();
      return { ok: true };
    } catch (error) {
      this.logger.error(`Redis health check failed: ${(error as Error).message}`);
      return { ok: false, error: (error as Error).message };
    }
  }

  onModuleDestroy() {
    this.redis.disconnect();
  }
}
