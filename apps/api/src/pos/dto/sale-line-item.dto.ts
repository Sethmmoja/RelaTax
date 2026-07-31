import { IsNumber, IsString, Min } from "class-validator";

export class SaleLineItemDto {
  @IsString()
  productId!: string;

  @IsNumber()
  @Min(0.01)
  quantity!: number;
}
