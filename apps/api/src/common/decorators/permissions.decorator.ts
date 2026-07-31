import { SetMetadata } from "@nestjs/common";
import { PermissionAction } from "@relatax/types";

export const PERMISSIONS_KEY = "permissions";
export const Permissions = (...permissions: PermissionAction[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
