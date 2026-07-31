import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { TaxStatus } from "@relatax/types";
import { BusinessMemberGuard } from "../common/guards/business-member.guard";
import { TaxesService } from "./taxes.service";

@ApiTags("taxes")
@ApiBearerAuth()
@UseGuards(BusinessMemberGuard)
@Controller("businesses/:businessId/taxes")
export class TaxesController {
  constructor(private taxesService: TaxesService) {}

  @Get()
  find(@Param("businessId") businessId: string, @Query("status") status?: TaxStatus) {
    return this.taxesService.findForBusiness(businessId, status);
  }

  @Get("history")
  history(@Param("businessId") businessId: string) {
    return this.taxesService.history(businessId);
  }
}
