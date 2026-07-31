import { Injectable } from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import { RoleName } from "@relatax/types";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findMe(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        phone: true,
        name: true,
        isStaff: true,
        emailVerifiedAt: true,
        mfaEnabled: true,
        roleAssignments: { select: { role: { select: { name: true } } } },
        businessMemberships: {
          select: { business: { select: { id: true, name: true, logoUrl: true, brandColor: true, status: true } } }
        }
      }
    });
  }

  async listStaff() {
    return this.prisma.user.findMany({
      where: { isStaff: true },
      select: {
        id: true,
        name: true,
        email: true,
        roleAssignments: { select: { role: { select: { name: true } } } }
      }
    });
  }

  async createStaffUser(input: { email: string; name: string; password: string; role: RoleName }) {
    const passwordHash = await bcrypt.hash(input.password, 12);
    return this.prisma.user.create({
      data: {
        email: input.email,
        name: input.name,
        passwordHash,
        isStaff: true,
        roleAssignments: {
          create: { role: { connect: { name: input.role } } }
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        roleAssignments: { select: { role: { select: { name: true } } } }
      }
    });
  }

  /** Staff hold exactly one primary role — replaces any existing assignment. */
  async updateRole(userId: string, role: RoleName) {
    const roleRecord = await this.prisma.role.findUniqueOrThrow({ where: { name: role } });

    await this.prisma.$transaction([
      this.prisma.roleAssignment.deleteMany({ where: { userId } }),
      this.prisma.roleAssignment.create({ data: { userId, roleId: roleRecord.id } })
    ]);

    return this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        roleAssignments: { select: { role: { select: { name: true } } } }
      }
    });
  }

  async listAssignments(userId: string) {
    const rows = await this.prisma.staffBusinessAssignment.findMany({
      where: { userId },
      include: { business: { select: { id: true, name: true } } }
    });
    return rows.map((r) => r.business);
  }

  /** Replace-all semantics, same pattern as updateRole's transaction above. */
  async setAssignments(userId: string, businessIds: string[]) {
    await this.prisma.$transaction([
      this.prisma.staffBusinessAssignment.deleteMany({ where: { userId } }),
      this.prisma.staffBusinessAssignment.createMany({
        data: businessIds.map((businessId) => ({ userId, businessId }))
      })
    ]);
    return this.listAssignments(userId);
  }
}
