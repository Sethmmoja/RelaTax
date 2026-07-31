import { Injectable, NotFoundException } from "@nestjs/common";
import { BusinessRequestStatus, BusinessStatus, NotificationChannel, NotificationType, RoleName } from "@relatax/types";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import type { AuthenticatedUser } from "../auth/auth.types";

@Injectable()
export class BusinessesService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService
  ) {}

  async listForUser(userId: string) {
    const memberships = await this.prisma.businessMember.findMany({
      where: { userId },
      include: { business: true }
    });
    return memberships.map((m) => m.business);
  }

  async findOneForUser(userId: string, businessId: string) {
    const business = await this.prisma.business.findFirst({
      where: { id: businessId, members: { some: { userId } } }
    });
    if (!business) throw new NotFoundException("Business not found");
    return business;
  }

  async requestNewBusiness(userId: string, notes: string | undefined) {
    const request = await this.prisma.businessRequest.create({
      data: { requestedByUserId: userId, notes, status: BusinessRequestStatus.PENDING as any }
    });

    await this.notifications.notifyStaff({
      type: NotificationType.ANNOUNCEMENT as any,
      channels: [NotificationChannel.PORTAL as any],
      title: "New business request",
      body: `A client has requested a new business be added.${notes ? ` Notes: ${notes}` : ""}`
    });

    return request;
  }

  async listRequests(status?: BusinessRequestStatus) {
    return this.prisma.businessRequest.findMany({
      where: status ? { status: status as any } : undefined,
      include: { requestedBy: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "desc" }
    });
  }

  async createBusiness(input: {
    name: string;
    ownerUserId: string;
    logoUrl?: string;
    brandColor?: string;
    fulfillsRequestId?: string;
  }) {
    const business = await this.prisma.business.create({
      data: {
        name: input.name,
        logoUrl: input.logoUrl,
        brandColor: input.brandColor,
        status: BusinessStatus.ACTIVE as any,
        members: { create: { userId: input.ownerUserId, isOwner: true } }
      }
    });

    if (input.fulfillsRequestId) {
      await this.prisma.businessRequest.update({
        where: { id: input.fulfillsRequestId },
        data: { status: BusinessRequestStatus.APPROVED as any, createdBusinessId: business.id, resolvedAt: new Date() }
      });
    }

    await this.notifications.notifyUser(input.ownerUserId, {
      type: NotificationType.ANNOUNCEMENT as any,
      channels: [NotificationChannel.PORTAL as any, NotificationChannel.WHATSAPP as any],
      title: "Your business is ready",
      body: `${business.name} has been set up and is now available in your account.`
    });

    return business;
  }

  async archiveBusiness(businessId: string) {
    return this.prisma.business.update({
      where: { id: businessId },
      data: { status: BusinessStatus.ARCHIVED as any }
    });
  }

  async updateBusiness(businessId: string, input: { name?: string; logoUrl?: string; brandColor?: string }) {
    return this.prisma.business.update({
      where: { id: businessId },
      data: {
        name: input.name,
        logoUrl: input.logoUrl,
        brandColor: input.brandColor
      }
    });
  }

  async listMembers(businessId: string) {
    const members = await this.prisma.businessMember.findMany({
      where: { businessId },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "asc" }
    });
    return members.map((m) => ({ ...m.user, isOwner: m.isOwner, memberSince: m.createdAt }));
  }

  async addMemberByEmail(businessId: string, email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new NotFoundException(`No user found with email ${email}`);

    await this.prisma.businessMember.upsert({
      where: { userId_businessId: { userId: user.id, businessId } },
      create: { userId: user.id, businessId, isOwner: false },
      update: {}
    });

    const business = await this.prisma.business.findUniqueOrThrow({ where: { id: businessId } });
    await this.notifications.notifyUser(user.id, {
      type: NotificationType.ANNOUNCEMENT as any,
      channels: [NotificationChannel.PORTAL as any],
      title: "You've been added to a business",
      body: `You now have access to ${business.name} on RelaTax.`
    });

    return this.listMembers(businessId);
  }

  async removeMember(businessId: string, userId: string) {
    await this.prisma.businessMember.delete({ where: { userId_businessId: { userId, businessId } } });
    return this.listMembers(businessId);
  }

  /** Super Admin sees every business; other staff see only their assigned ones. */
  async listAllForStaff(user: AuthenticatedUser) {
    if (user.roles.includes(RoleName.SUPER_ADMIN)) {
      return this.prisma.business.findMany({ orderBy: { createdAt: "desc" } });
    }
    return this.prisma.business.findMany({
      where: { staffAssignments: { some: { userId: user.id } } },
      orderBy: { createdAt: "desc" }
    });
  }
}
