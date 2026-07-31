import { IsArray, IsEnum, IsISO8601, IsOptional, IsString } from "class-validator";
import { NotificationChannel, NotificationType } from "@relatax/types";

export class SendNotificationDto {
  @IsEnum(NotificationType)
  type!: NotificationType;

  @IsArray()
  @IsEnum(NotificationChannel, { each: true })
  channels!: NotificationChannel[];

  @IsString()
  title!: string;

  @IsString()
  body!: string;

  @IsOptional()
  @IsString()
  businessId?: string;

  @IsOptional()
  @IsString()
  userId?: string;

  /** ISO datetime — if in the future, delivery and client visibility are deferred until then. */
  @IsOptional()
  @IsISO8601()
  scheduledFor?: string;
}
