import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { RoleName } from "@relatax/types";
import { Roles } from "../../common/decorators/roles.decorator";
import { MpesaConnectionService } from "./mpesa-connection.service";
import { UpsertMpesaConnectionDto } from "./dto/upsert-mpesa-connection.dto";

@ApiTags("mpesa")
@ApiBearerAuth()
@Controller("admin/businesses/:businessId/mpesa/connection")
export class MpesaConnectionController {
  constructor(private mpesaConnectionService: MpesaConnectionService) {}

  @Roles(RoleName.SUPER_ADMIN, RoleName.ADMIN)
  @Get()
  get(@Param("businessId") businessId: string) {
    return this.mpesaConnectionService.getConnectionSummary(businessId);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.ADMIN)
  @Post()
  upsert(@Param("businessId") businessId: string, @Body() dto: UpsertMpesaConnectionDto) {
    return this.mpesaConnectionService.upsert(businessId, dto);
  }
}
