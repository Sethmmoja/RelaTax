import { Module } from "@nestjs/common";
import { EmployeesService } from "./employees.service";
import { PayrollService } from "./payroll.service";
import { PayslipPdfService } from "./payslip-pdf.service";
import { PayrollReportPdfService } from "./payroll-report-pdf.service";
import { PayrollController } from "./payroll.controller";
import { DocumentsModule } from "../documents/documents.module";
import { EmailModule } from "../email/email.module";

@Module({
  imports: [DocumentsModule, EmailModule],
  controllers: [PayrollController],
  providers: [EmployeesService, PayrollService, PayslipPdfService, PayrollReportPdfService],
  exports: [EmployeesService, PayrollService]
})
export class PayrollModule {}
