import { Type } from "class-transformer";
import { ArrayMinSize, IsNumber, IsOptional, IsString, Min, ValidateNested } from "class-validator";
import { SaleLineItemDto } from "./sale-line-item.dto";

export class CreateCashSaleDto {
  @IsOptional()
  @IsString()
  customerName?: string;

  @ValidateNested({ each: true })
  @Type(() => SaleLineItemDto)
  @ArrayMinSize(1)
  lineItems!: SaleLineItemDto[];

  @IsNumber()
  @Min(0)
  cashReceived!: number;
}
