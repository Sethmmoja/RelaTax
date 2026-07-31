import { Injectable } from "@nestjs/common";
import { TaxStatus } from "@relatax/types";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class TaxesService {
  constructor(private prisma: PrismaService) {}

  async findForBusiness(businessId: string, status?: TaxStatus) {
    return this.prisma.taxRecord.findMany({
      where: { businessId, ...(status ? { status: status as any } : {}) },
      include: { period: true },
      orderBy: { dueDate: "desc" }
    });
  }

  async history(businessId: string) {
    return this.prisma.taxRecord.findMany({
      where: { businessId },
      include: { period: true },
      orderBy: { dueDate: "desc" }
    });
  }
}
