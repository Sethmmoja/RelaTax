import { InjectQueue } from "@nestjs/bullmq";
import { Injectable, NotFoundException } from "@nestjs/common";
import { Queue } from "bullmq";
import { NotificationChannel, NotificationType } from "@relatax/types";
import { PrismaService } from "../prisma/prisma.service";

export interface SendNotificationInput {
  type: NotificationType;
  channels: NotificationChannel[];
  title: string;
  body: string;
  businessId?: string;
  userId?: string;
  /** If set in the future, the notification is hidden from clients and undelivered until then. */
  scheduledFor?: string;
}

@Injectable()
export class NotificationsService {
  constructor(
    private prisma: PrismaService,
    @InjectQueue("notifications") private queue: Queue
  ) {}

  async notifyUser(userId: string, input: Omit<SendNotificationInput, "userId">) {
    return this.send({ ...input, userId });
  }

  async notifyBusiness(businessId: string, input: Omit<SendNotificationInput, "businessId">) {
    return this.send({ ...input, businessId });
  }

  /** Fan-out to every staff user; used for internal alerts like a new BusinessRequest. */
  async notifyStaff(input: Omit<SendNotificationInput, "userId" | "businessId">) {
    const staff = await this.prisma.user.findMany({ where: { isStaff: true }, select: { id: true } });
    return Promise.all(staff.map((s) => this.send({ ...input, userId: s.id })));
  }

  async send(input: SendNotificationInput) {
    const scheduledFor = input.scheduledFor ? new Date(input.scheduledFor) : null;
    const delay = scheduledFor ? Math.max(0, scheduledFor.getTime() - Date.now()) : 0;

    const notification = await this.prisma.notification.create({
      data: {
        type: input.type as any,
        channels: input.channels as any,
        title: input.title,
        body: input.body,
        businessId: input.businessId,
        userId: input.userId,
        scheduledFor
      }
    });

    await this.queue.add("deliver", { notificationId: notification.id }, delay > 0 ? { delay } : undefined);
    return notification;
  }

  /**
   * A notification belongs to a user if it was addressed to them directly, or
   * if it's scoped to a business they're a member of (e.g. a filing reminder
   * sent to the whole business rather than one person). Scheduled notifications
   * stay invisible to clients until their scheduled time arrives.
   */
  async listForUser(userId: string, businessIds: string[] = []) {
    return this.prisma.notification.findMany({
      where: {
        AND: [
          { OR: [{ userId }, ...(businessIds.length ? [{ businessId: { in: businessIds } }] : [])] },
          { OR: [{ scheduledFor: null }, { scheduledFor: { lte: new Date() } }] }
        ]
      },
      orderBy: { createdAt: "desc" }
    });
  }

  /** Scoped the same way listForUser is — a notification can only be marked read by the user/business it belongs to. */
  async markRead(notificationId: string, userId: string, businessIds: string[] = []) {
    const result = await this.prisma.notification.updateMany({
      where: {
        id: notificationId,
        OR: [{ userId }, ...(businessIds.length ? [{ businessId: { in: businessIds } }] : [])]
      },
      data: { readAt: new Date() }
    });
    if (result.count === 0) throw new NotFoundException("Notification not found");
  }
}
