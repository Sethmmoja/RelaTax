import { IsString, MinLength } from "class-validator";

export class RejectInvoiceRequestDto {
  @IsString()
  @MinLength(3)
  reason!: string;
}
