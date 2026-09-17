import { ArrayMinSize, IsArray, IsEmail, IsInt, IsOptional, IsString, MaxLength } from "class-validator";

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

  /**
   * Honeypot. The form renders this field off-screen with autocomplete off;
   * people never see it, form-filling bots complete every field. Anything in
   * it marks the submission as spam.
   */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  website?: string;

  /**
   * Time trap: the epoch millisecond the form was rendered. A submission
   * arriving under a few seconds after render was not typed by a person.
   */
  @IsOptional()
  @IsInt()
  formRenderedAt?: number;
}
