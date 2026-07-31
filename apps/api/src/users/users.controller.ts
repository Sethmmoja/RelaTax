import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { RoleName } from "@relatax/types";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import type { AuthenticatedUser } from "../auth/auth.types";
import { UsersService } from "./users.service";
import { CreateStaffUserDto } from "./dto/create-staff-user.dto";
import { UpdateUserRoleDto } from "./dto/update-user-role.dto";
import { SetAssignmentsDto } from "./dto/set-assignments.dto";

@ApiTags("users")
@ApiBearerAuth()
@Controller("users")
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get("me")
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.findMe(user.id);
  }

  @Roles(RoleName.SUPER_ADMIN)
  @Get()
  list() {
    return this.usersService.listStaff();
  }

  @Roles(RoleName.SUPER_ADMIN)
  @Post()
  create(@Body() dto: CreateStaffUserDto) {
    return this.usersService.createStaffUser(dto);
  }

  @Roles(RoleName.SUPER_ADMIN)
  @Patch(":userId/role")
  updateRole(@Param("userId") userId: string, @Body() dto: UpdateUserRoleDto) {
    return this.usersService.updateRole(userId, dto.role);
  }

  /** Which clients a non-Super-Admin staff member may act on. Super Admin-only to view/manage. */
  @Roles(RoleName.SUPER_ADMIN)
  @Get(":userId/business-assignments")
  listAssignments(@Param("userId") userId: string) {
    return this.usersService.listAssignments(userId);
  }

  @Roles(RoleName.SUPER_ADMIN)
  @Post(":userId/business-assignments")
  setAssignments(@Param("userId") userId: string, @Body() dto: SetAssignmentsDto) {
    return this.usersService.setAssignments(userId, dto.businessIds);
  }
}
