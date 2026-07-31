import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UnsupportedMediaTypeException,
  UploadedFile,
  UseGuards,
  UseInterceptors
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBearerAuth, ApiConsumes, ApiTags } from "@nestjs/swagger";
import { DocumentCategory } from "@relatax/types";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { BusinessMemberGuard } from "../common/guards/business-member.guard";
import type { AuthenticatedUser } from "../auth/auth.types";
import { DocumentsService } from "./documents.service";
import { UploadDocumentDto } from "./dto/upload-document.dto";

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024; // 25MB — generous for scanned statements/receipts
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
]);

@ApiTags("documents")
@ApiBearerAuth()
@UseGuards(BusinessMemberGuard)
@Controller("businesses/:businessId/documents")
export class DocumentsController {
  constructor(private documentsService: DocumentsService) {}

  @Get()
  list(@Param("businessId") businessId: string, @Query("category") category?: DocumentCategory) {
    return this.documentsService.listForBusiness(businessId, category);
  }

  @Get("periods")
  listPeriods(@Param("businessId") businessId: string) {
    return this.documentsService.listPeriodsForBusiness(businessId);
  }

  @ApiConsumes("multipart/form-data")
  @Post()
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
  upload(
    @Param("businessId") businessId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UploadDocumentDto,
    @UploadedFile() file: Express.Multer.File
  ) {
    return this.documentsService.upload({
      businessId,
      uploadedById: user.id,
      category: dto.category,
      reportType: dto.reportType,
      periodId: dto.periodId,
      periodLabel: dto.periodLabel,
      periodStart: dto.periodStart,
      periodEnd: dto.periodEnd,
      originalName: file.originalname,
      mimeType: file.mimetype,
      buffer: file.buffer
    });
  }

  @Get(":documentId/download")
  download(@Param("documentId") documentId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.documentsService.getDownloadUrl(documentId, user.id);
  }
}
