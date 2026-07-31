import { IsEmail, IsEnum, IsNumber, IsOptional, IsString, Min } from "class-validator";
import { EmployeeStatus } from "@relatax/types";

export class UpdateEmployeeDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  kraPin?: string;

  @IsOptional()
  @IsString()
  nssfNo?: string;

  @IsOptional()
  @IsString()
  shifNo?: string;

  @IsOptional()
  @IsString()
  nationalId?: string;

  @IsOptional()
  @IsString()
  staffNo?: string;

  @IsOptional()
  @IsString()
  bankName?: string;

  @IsOptional()
  @IsString()
  bankAccountNumber?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  basicSalary?: number;

  @IsOptional()
  @IsEnum(EmployeeStatus)
  status?: EmployeeStatus;
}
