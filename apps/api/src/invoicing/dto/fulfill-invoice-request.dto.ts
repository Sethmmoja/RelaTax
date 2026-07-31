import { IsOptional, IsString } from "class-validator";

/**
 * Sent as multipart/form-data alongside the eTIMS PDF file. `lineItems` arrives
 * as a JSON-encoded string (multipart fields are always strings) and is
 * parsed/validated in InvoicingService.parseLineItems rather than here.
 */
export class FulfillInvoiceRequestDto {
  @IsString()
  lineItems!: string;

  @IsString()
  kraInvoiceNo!: string;

  @IsOptional()
  @IsString()
  cuSerialNumber?: string;

  @IsOptional()
  @IsString()
  qrCodeUrl?: string;
}
