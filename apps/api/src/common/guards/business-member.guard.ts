import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { RoleName } from "@relatax/types";
import type { AuthenticatedUser } from "../../auth/auth.types";

/**
 * Confirms the caller has access to the :businessId route param. Super Admin
 * bypasses entirely (can act on any business). Other staff are restricted to
 * their StaffBusinessAssignment rows. Clients need a BusinessMember row.
 */
@Injectable()
export class BusinessMemberGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user: AuthenticatedUser | undefined = request.user;
    const businessId = request.params?.businessId;

    if (!user) return false;
    if (!businessId) return true;

    if (user.isStaff) {
      if (user.roles.includes(RoleName.SUPER_ADMIN)) return true;
      if (!user.staffBusinessIds.includes(businessId)) {
        throw new ForbiddenException("You are not assigned to this business.");
      }
      return true;
    }

    if (!user.businessIds.includes(businessId)) {
      throw new ForbiddenException("You do not have access to this business.");
    }
    return true;
  }
}
