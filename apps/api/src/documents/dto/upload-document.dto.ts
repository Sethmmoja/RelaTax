import { IsEnum, IsISO8601, IsOptional, IsString } from "class-validator";
import { DocumentCategory, ReportType } from "@relatax/types";

export class UploadDocumentDto {
  @IsEnum(DocumentCategory)
  category!: DocumentCategory;

  @IsOptional()
  @IsEnum(ReportType)
  reportType?: ReportType;

  /** Reference an existing reporting period by id, e.g. picked from a prior upload. */
  @IsOptional()
  @IsString()
  periodId?: string;

  /**
   * Or define/reuse a period inline (e.g. "01/01/2026 - 31/05/2026") — the service
   * upserts a ReportPeriod for this business rather than requiring a separate
   * period-management screen.
   */
  @IsOptional()
  @IsString()
  periodLabel?: string;

  @IsOptional()
  @IsISO8601()
  periodStart?: string;

  @IsOptional()
  @IsISO8601()
  periodEnd?: string;
}
