import { PermissionAction, RoleName } from "./enums";

/**
 * Source-of-truth default grants, seeded into Role/RolePermission at db:seed time.
 * Runtime enforcement always reads from the database (see docs/architecture/roles-permissions-matrix.md)
 * so changing a grant in production is a data change, not a redeploy.
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<RoleName, PermissionAction[]> = {
  [RoleName.SUPER_ADMIN]: Object.values(PermissionAction),
  [RoleName.ADMIN]: Object.values(PermissionAction),
  [RoleName.FINANCE]: [
    PermissionAction.VIEW,
    PermissionAction.CREATE,
    PermissionAction.EDIT,
    PermissionAction.UPLOAD,
    PermissionAction.DOWNLOAD,
    PermissionAction.APPROVE
  ],
  [RoleName.ACCOUNTANT]: [
    PermissionAction.VIEW,
    PermissionAction.CREATE,
    PermissionAction.EDIT,
    PermissionAction.UPLOAD,
    PermissionAction.DOWNLOAD
  ],
  [RoleName.TAX_CONSULTANT]: [
    PermissionAction.VIEW,
    PermissionAction.CREATE,
    PermissionAction.EDIT,
    PermissionAction.UPLOAD,
    PermissionAction.DOWNLOAD
  ],
  [RoleName.SUPPORT]: [PermissionAction.VIEW, PermissionAction.DOWNLOAD],
  [RoleName.READ_ONLY]: [PermissionAction.VIEW, PermissionAction.DOWNLOAD]
};
