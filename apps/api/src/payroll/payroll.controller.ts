import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UnsupportedMediaTypeException,
  UploadedFile,
  UseGuards,
  UseInterceptors
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBearerAuth, ApiConsumes, ApiTags } from "@nestjs/swagger";
import { RoleName } from "@relatax/types";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { BusinessMemberGuard } from "../common/guards/business-member.guard";
import type { AuthenticatedUser } from "../auth/auth.types";
import { EmployeesService } from "./employees.service";
import { PayrollService } from "./payroll.service";
import { CreateEmployeeDto } from "./dto/create-employee.dto";
import { UpdateEmployeeDto } from "./dto/update-employee.dto";
import { CreatePayrollRunDto } from "./dto/create-payroll-run.dto";
import { AttachEmployeeDocumentDto } from "./dto/attach-employee-document.dto";

const STAFF_WRITE_ROLES = [RoleName.SUPER_ADMIN, RoleName.ADMIN, RoleName.FINANCE, RoleName.ACCOUNTANT];
const STAFF_APPROVE_ROLES = [RoleName.SUPER_ADMIN, RoleName.ADMIN, RoleName.FINANCE];

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
]);

@ApiTags("payroll")
@ApiBearerAuth()
@Controller()
export class PayrollController {
  constructor(
    private employeesService: EmployeesService,
    private payrollService: PayrollService
  ) {}

  @Roles(...STAFF_WRITE_ROLES)
  @UseGuards(BusinessMemberGuard)
  @Post("businesses/:businessId/employees")
  createEmployee(@Param("businessId") businessId: string, @Body() dto: CreateEmployeeDto) {
    return this.employeesService.create({ businessId, ...dto });
  }

  @Roles(...STAFF_WRITE_ROLES)
  @UseGuards(BusinessMemberGuard)
  @Get("businesses/:businessId/employees")
  listEmployees(@Param("businessId") businessId: string) {
    return this.employeesService.listForBusiness(businessId);
  }

  @Roles(...STAFF_WRITE_ROLES)
  @UseGuards(BusinessMemberGuard)
  @Patch("businesses/:businessId/employees/:employeeId")
  updateEmployee(@Param("employeeId") employeeId: string, @Body() dto: UpdateEmployeeDto) {
    return this.employeesService.update(employeeId, dto);
  }

  @ApiConsumes("multipart/form-data")
  @Roles(...STAFF_WRITE_ROLES)
  @UseGuards(BusinessMemberGuard)
  @Post("businesses/:businessId/employees/:employeeId/documents")
  @UseInterceptors(
    FileInterceptor("file", {
      limits: { fileSize: MAX_UPLOAD_BYTES },
      fileFilter: (_req, file, callback) => {
        if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
          callback(new UnsupportedMediaTypeException(`Unsupported file type: ${file.mimetype}`), false);
          return;
        }
        callback(null, true);
      }
    })
  )
  attachEmployeeDocument(
    @Param("employeeId") employeeId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AttachEmployeeDocumentDto,
    @UploadedFile() file: Express.Multer.File
  ) {
    return this.employeesService.attachDocument(employeeId, dto.label, user.id, {
      originalName: file.originalname,
      mimeType: file.mimetype,
      buffer: file.buffer
    });
  }

  @Roles(...STAFF_WRITE_ROLES)
  @UseGuards(BusinessMemberGuard)
  @Post("businesses/:businessId/payroll-runs")
  createRun(
    @Param("businessId") businessId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePayrollRunDto
  ) {
    return this.payrollService.createRun(businessId, dto.periodLabel, user.id);
  }

  @Roles(...STAFF_WRITE_ROLES)
  @UseGuards(BusinessMemberGuard)
  @Get("businesses/:businessId/payroll-runs")
  listRuns(@Param("businessId") businessId: string) {
    return this.payrollService.listRuns(businessId);
  }

  @Roles(...STAFF_WRITE_ROLES)
  @Get("payroll-runs/:runId")
  getRun(@Param("runId") runId: string) {
    return this.payrollService.getRun(runId);
  }

  @Roles(...STAFF_WRITE_ROLES)
  @Post("payroll-runs/:runId/calculate")
  calculate(@Param("runId") runId: string) {
    return this.payrollService.calculate(runId);
  }

  @Roles(...STAFF_APPROVE_ROLES)
  @Post("payroll-runs/:runId/approve")
  approve(@Param("runId") runId: string) {
    return this.payrollService.approve(runId);
  }

  @Roles(...STAFF_APPROVE_ROLES)
  @Post("payroll-runs/:runId/distribute")
  distribute(@Param("runId") runId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.payrollService.distribute(runId, user.id);
  }

  /** Client-portal-facing — the business owner's own view, not the staff run-management screen above. */
  @UseGuards(BusinessMemberGuard)
  @Get("businesses/:businessId/payroll-summary")
  listSummary(@Param("businessId") businessId: string) {
    return this.payrollService.listSummaryForBusiness(businessId);
  }
}
