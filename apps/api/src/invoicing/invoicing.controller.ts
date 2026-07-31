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
import { InvoiceRequestStatus, RoleName } from "@relatax/types";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { BusinessMemberGuard } from "../common/guards/business-member.guard";
import type { AuthenticatedUser } from "../auth/auth.types";
import { InvoicingService } from "./invoicing.service";
import { CreateInvoiceRequestDto } from "./dto/create-invoice-request.dto";
import { FulfillInvoiceRequestDto } from "./dto/fulfill-invoice-request.dto";
import { RejectInvoiceRequestDto } from "./dto/reject-invoice-request.dto";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(["application/pdf", "image/jpeg", "image/png"]);

@ApiTags("invoicing")
@ApiBearerAuth()
@Controller()
export class InvoicingController {
  constructor(private invoicingService: InvoicingService) {}

  @UseGuards(BusinessMemberGuard)
  @Post("businesses/:businessId/invoice-requests")
  createRequest(
    @Param("businessId") businessId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateInvoiceRequestDto
  ) {
    return this.invoicingService.createRequest({
      businessId,
      requestedByUserId: user.id,
      customerName: dto.customerName,
      customerKraPin: dto.customerKraPin,
      itemDescription: dto.itemDescription,
      amount: dto.amount
    });
  }

  @UseGuards(BusinessMemberGuard)
  @Get("businesses/:businessId/invoices")
  listInvoices(@Param("businessId") businessId: string) {
    return this.invoicingService.listInvoicesForBusiness(businessId);
  }

  @UseGuards(BusinessMemberGuard)
  @Get("businesses/:businessId/invoice-requests")
  listRequestsForBusiness(@Param("businessId") businessId: string) {
    return this.invoicingService.listRequestsForBusiness(businessId);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.ADMIN)
  @Get("admin/invoice-requests")
  listRequests(@Query("status") status?: InvoiceRequestStatus) {
    return this.invoicingService.listRequests(status);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.ADMIN)
  @Get("admin/invoice-requests/:requestId")
  getRequest(@Param("requestId") requestId: string) {
    return this.invoicingService.getRequest(requestId);
  }

  @ApiConsumes("multipart/form-data")
  @Roles(RoleName.SUPER_ADMIN)
  @Post("admin/invoice-requests/:requestId/fulfill")
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
  fulfillRequest(
    @Param("requestId") requestId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: FulfillInvoiceRequestDto,
    @UploadedFile() file: Express.Multer.File
  ) {
    const lineItems = this.invoicingService.parseLineItems(dto.lineItems);
    return this.invoicingService.fulfillRequest(requestId, {
      staffUserId: user.id,
      lineItems,
      kraInvoiceNo: dto.kraInvoiceNo,
      cuSerialNumber: dto.cuSerialNumber,
      qrCodeUrl: dto.qrCodeUrl,
      documentFile: { originalName: file.originalname, mimeType: file.mimetype, buffer: file.buffer }
    });
  }

  @Roles(RoleName.SUPER_ADMIN)
  @Post("admin/invoice-requests/:requestId/reject")
  rejectRequest(
    @Param("requestId") requestId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RejectInvoiceRequestDto
  ) {
    return this.invoicingService.rejectRequest(requestId, user.id, dto.reason);
  }
}
