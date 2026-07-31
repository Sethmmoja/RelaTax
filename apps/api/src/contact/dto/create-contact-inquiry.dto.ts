import { ArrayMinSize, IsArray, IsEmail, IsOptional, IsString, MaxLength } from "class-validator";

export class CreateContactInquiryDto {
  @IsString()
  @MaxLength(200)
  name!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsString()
  @MaxLength(200)
  company!: string;

  @IsString()
  @MaxLength(100)
  sector!: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  services!: string[];

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  message?: string;
}
