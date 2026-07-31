import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

export interface UpsertMpesaConnectionInput {
  environment: string;
  shortCode: string;
  consumerKey: string;
  consumerSecret: string;
  passkey: string;
}

@Injectable()
export class MpesaConnectionService {
  constructor(private prisma: PrismaService) {}

  /** Safe for the admin UI — never includes the secret/passkey. */
  async getConnectionSummary(businessId: string) {
    const connection = await this.prisma.mpesaConnection.findUnique({ where: { businessId } });
    if (!connection) return { connected: false as const };
    return { connected: true as const, environment: connection.environment, shortCode: connection.shortCode };
  }

  /** Internal use only (SalesService) — includes the real secrets. */
  async getCredentials(businessId: string) {
    const connection = await this.prisma.mpesaConnection.findUnique({ where: { businessId } });
    if (!connection) {
      throw new BadRequestException("M-Pesa isn't set up for this business yet — ask RelaTax staff to configure it.");
    }
    return connection;
  }

  async upsert(businessId: string, input: UpsertMpesaConnectionInput) {
    await this.prisma.mpesaConnection.upsert({
      where: { businessId },
      create: { businessId, ...input },
      update: input
    });
    return this.getConnectionSummary(businessId);
  }
}
