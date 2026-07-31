import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { BusinessRequestStatus, RoleName } from "@relatax/types";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { BusinessMemberGuard } from "../common/guards/business-member.guard";
import type { AuthenticatedUser } from "../auth/auth.types";
import { BusinessesService } from "./businesses.service";
import { CreateBusinessRequestDto } from "./dto/create-business-request.dto";
import { CreateBusinessDto } from "./dto/create-business.dto";
import { UpdateBusinessDto } from "./dto/update-business.dto";
import { AddMemberDto } from "./dto/add-member.dto";

@ApiTags("businesses")
@ApiBearerAuth()
@Controller()
export class BusinessesController {
  constructor(private businessesService: BusinessesService) {}

  @Get("businesses")
  listMine(@CurrentUser() user: AuthenticatedUser) {
    return this.businessesService.listForUser(user.id);
  }

  @UseGuards(BusinessMemberGuard)
  @Get("businesses/:businessId")
  findOne(@CurrentUser() user: AuthenticatedUser, @Param("businessId") businessId: string) {
    return this.businessesService.findOneForUser(user.id, businessId);
  }

  @Post("businesses/requests")
  requestBusiness(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateBusinessRequestDto) {
    return this.businessesService.requestNewBusiness(user.id, dto.notes);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.ADMIN, RoleName.FINANCE)
  @Get("admin/businesses/requests")
  listRequests(@Query("status") status?: BusinessRequestStatus) {
    return this.businessesService.listRequests(status);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.ADMIN)
  @Post("admin/businesses")
  create(@Body() dto: CreateBusinessDto) {
    return this.businessesService.createBusiness(dto);
  }

  @Roles(
    RoleName.SUPER_ADMIN,
    RoleName.ADMIN,
    RoleName.FINANCE,
    RoleName.ACCOUNTANT,
    RoleName.TAX_CONSULTANT,
    RoleName.SUPPORT,
    RoleName.READ_ONLY
  )
  @Get("admin/businesses")
  listAll(@CurrentUser() user: AuthenticatedUser) {
    return this.businessesService.listAllForStaff(user);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.ADMIN)
  @Patch("admin/businesses/:businessId/archive")
  archive(@Param("businessId") businessId: string) {
    return this.businessesService.archiveBusiness(businessId);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.ADMIN)
  @Patch("admin/businesses/:businessId")
  update(@Param("businessId") businessId: string, @Body() dto: UpdateBusinessDto) {
    return this.businessesService.updateBusiness(businessId, dto);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.ADMIN)
  @Get("admin/businesses/:businessId/members")
  listMembers(@Param("businessId") businessId: string) {
    return this.businessesService.listMembers(businessId);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.ADMIN)
  @Post("admin/businesses/:businessId/members")
  addMember(@Param("businessId") businessId: string, @Body() dto: AddMemberDto) {
    return this.businessesService.addMemberByEmail(businessId, dto.email);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.ADMIN)
  @Delete("admin/businesses/:businessId/members/:userId")
  removeMember(@Param("businessId") businessId: string, @Param("userId") userId: string) {
    return this.businessesService.removeMember(businessId, userId);
  }
}
