import { IsString, Matches } from "class-validator";

const E164 = /^\+[1-9]\d{6,14}$/;

export class OtpRequestDto {
  @IsString()
  @Matches(E164, { message: "phone must be in E.164 format, e.g. +254712345678" })
  phone!: string;
}

export class OtpVerifyDto {
  @IsString()
  @Matches(E164)
  phone!: string;

  @IsString()
  code!: string;
}
