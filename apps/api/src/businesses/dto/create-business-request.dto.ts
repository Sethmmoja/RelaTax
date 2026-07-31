import { IsOptional, IsString } from "class-validator";

export class CreateBusinessRequestDto {
  @IsOptional()
  @IsString()
  notes?: string;
}
