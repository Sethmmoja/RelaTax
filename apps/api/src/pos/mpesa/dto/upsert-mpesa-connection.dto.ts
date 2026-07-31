import { IsIn, IsString } from "class-validator";

export class UpsertMpesaConnectionDto {
  @IsIn(["sandbox", "production"])
  environment!: string;

  @IsString()
  shortCode!: string;

  @IsString()
  consumerKey!: string;

  @IsString()
  consumerSecret!: string;

  @IsString()
  passkey!: string;
}
