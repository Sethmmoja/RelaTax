import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export interface AuditLogFilters {
  actor?: string;
  entityType?: string;
  from?: string;
  to?: string;
}

@Injectable()
export class AuditLogService {
  constructor(private prisma: PrismaService) {}

  async list(filters: AuditLogFilters) {
    return this.prisma.auditLog.findMany({
      where: {
        userId: filters.actor,
        entityType: filters.entityType,
        createdAt: {
          ...(filters.from ? { gte: new Date(filters.from) } : {}),
          ...(filters.to ? { lte: new Date(filters.to) } : {})
        }
      },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      take: 200
    });
  }
}
