import { Type } from "class-transformer";
import { ArrayMinSize, IsOptional, IsString, Matches, ValidateNested } from "class-validator";
import { SaleLineItemDto } from "./sale-line-item.dto";

export class InitiateMpesaSaleDto {
  @IsOptional()
  @IsString()
  customerName?: string;

  /** MSISDN format Safaricom expects, e.g. 2547XXXXXXXX. */
  @IsString()
  @Matches(/^254\d{9}$/, { message: "Phone number must be in the format 254XXXXXXXXX" })
  customerPhone!: string;

  @ValidateNested({ each: true })
  @Type(() => SaleLineItemDto)
  @ArrayMinSize(1)
  lineItems!: SaleLineItemDto[];
}
