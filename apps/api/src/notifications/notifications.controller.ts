import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { RoleName } from "@relatax/types";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import type { AuthenticatedUser } from "../auth/auth.types";
import { NotificationsService } from "./notifications.service";
import { SendNotificationDto } from "./dto/send-notification.dto";

@ApiTags("notifications")
@ApiBearerAuth()
@Controller()
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Get("notifications")
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.listForUser(user.id, user.businessIds);
  }

  @Patch("notifications/:id/read")
  markRead(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.markRead(id, user.id, user.businessIds);
  }

  @Roles(RoleName.SUPER_ADMIN)
  @Post("admin/notifications")
  send(@Body() dto: SendNotificationDto) {
    return this.notificationsService.send(dto);
  }
}
