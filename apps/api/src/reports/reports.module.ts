import { Module } from "@nestjs/common";
import { ReportsService } from "./reports.service";
import { ReportsController } from "./reports.controller";
import { ReportRendererService } from "./report-renderer.service";
import { DocumentsModule } from "../documents/documents.module";

@Module({
  imports: [DocumentsModule],
  controllers: [ReportsController],
  providers: [ReportsService, ReportRendererService],
  exports: [ReportsService]
})
export class ReportsModule {}
