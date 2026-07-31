import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { BusinessMemberGuard } from "../common/guards/business-member.guard";
import type { AuthenticatedUser } from "../auth/auth.types";
import { ReportsService } from "./reports.service";
import { ReportFilterDto } from "./dto/report-filter.dto";

@ApiTags("reports")
@ApiBearerAuth()
@UseGuards(BusinessMemberGuard)
@Controller()
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Get("businesses/:businessId/reports")
  find(@Param("businessId") businessId: string, @Query() filters: ReportFilterDto) {
    return this.reportsService.findReports(businessId, filters);
  }

  @Get("reports/:reportId/export")
  export(
    @Param("reportId") reportId: string,
    @Query("format") format: "pdf" | "xlsx" = "pdf",
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.reportsService.exportReport(reportId, format, user);
  }
}
