import { IsBoolean, IsOptional, IsString } from "class-validator";

export class SimulateMpesaCallbackDto {
  @IsString()
  checkoutRequestId!: string;

  @IsBoolean()
  success!: boolean;

  @IsOptional()
  @IsString()
  mpesaReceiptNumber?: string;
}
