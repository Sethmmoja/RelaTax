import { IsString } from "class-validator";

export class CreatePayrollRunDto {
  @IsString()
  periodLabel!: string;
}
