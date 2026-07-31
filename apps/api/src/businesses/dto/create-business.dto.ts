import { IsOptional, IsString } from "class-validator";

export class CreateBusinessDto {
  @IsString()
  name!: string;

  @IsString()
  ownerUserId!: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsString()
  brandColor?: string;

  @IsOptional()
  @IsString()
  fulfillsRequestId?: string;
}
