import { IsString, Matches, MinLength } from "class-validator";

const E164 = /^\+[1-9]\d{6,14}$/;

export class EnableMfaDto {
  @IsString()
  @Matches(E164, { message: "phone must be in E.164 format, e.g. +254712345678" })
  phone!: string;

  @IsString()
  code!: string;
}

export class DisableMfaDto {
  @IsString()
  @MinLength(8)
  password!: string;
}
