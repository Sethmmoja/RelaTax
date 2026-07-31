import { Controller, Get, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { RoleName } from "@relatax/types";
import { Roles } from "../common/decorators/roles.decorator";
import { AuditLogService } from "./audit-log.service";

@ApiTags("audit-log")
@ApiBearerAuth()
@Roles(RoleName.SUPER_ADMIN)
@Controller("admin/audit-log")
export class AuditLogController {
  constructor(private auditLogService: AuditLogService) {}

  @Get()
  list(
    @Query("actor") actor?: string,
    @Query("entityType") entityType?: string,
    @Query("from") from?: string,
    @Query("to") to?: string
  ) {
    return this.auditLogService.list({ actor, entityType, from, to });
  }
}
