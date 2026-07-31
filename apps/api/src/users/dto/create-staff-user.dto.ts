import { IsEmail, IsEnum, IsString, MinLength } from "class-validator";
import { RoleName } from "@relatax/types";

export class CreateStaffUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  name!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsEnum(RoleName)
  role!: RoleName;
}
