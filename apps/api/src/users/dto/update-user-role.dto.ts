import { IsEnum } from "class-validator";
import { RoleName } from "@relatax/types";

export class UpdateUserRoleDto {
  @IsEnum(RoleName)
  role!: RoleName;
}
