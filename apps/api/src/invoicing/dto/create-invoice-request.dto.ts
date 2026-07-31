import { IsNumber, IsOptional, IsString, Matches, Min } from "class-validator";
import { KRA_PIN_REGEX } from "../kra-pin.util";

export class CreateInvoiceRequestDto {
  @IsString()
  customerName!: string;

  @IsOptional()
  @IsString()
  @Matches(KRA_PIN_REGEX, { message: "KRA PIN must look like A123456789Z" })
  customerKraPin?: string;

  @IsString()
  itemDescription!: string;

  @IsNumber()
  @Min(0.01)
  amount!: number;
}
