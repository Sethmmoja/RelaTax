import { Controller, Get, Logger, Param, Post, Query, Res, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import { RoleName } from "@relatax/types";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Public } from "../common/decorators/public.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { BusinessMemberGuard } from "../common/guards/business-member.guard";
import type { AuthenticatedUser } from "../auth/auth.types";
import { CloudDriveService } from "./cloud-drive.service";

@ApiTags("cloud-drive")
@Controller()
export class CloudDriveController {
  private readonly logger = new Logger(CloudDriveController.name);

  constructor(private cloudDriveService: CloudDriveService) {}

  @ApiBearerAuth()
  @Roles(RoleName.SUPER_ADMIN, RoleName.ADMIN, RoleName.FINANCE)
  @UseGuards(BusinessMemberGuard)
  @Get("businesses/:businessId/cloud-drive/connect")
  connect(@Param("businessId") businessId: string) {
    return { url: this.cloudDriveService.getAuthorizationUrl(businessId) };
  }

  /**
   * Google/Dropbox redirects the user's real browser here after consent — this
   * must never return the connection object (it holds access/refresh tokens),
   * so it redirects into the admin app instead. The mock connector's fabricated
   * tokens have nothing to protect, so the dev/demo flow (the admin UI calling
   * this endpoint directly to simulate a connection) still gets a plain JSON
   * response, matching how it's already being called.
   */
  @Public()
  @Get("cloud-drive/callback")
  async callback(@Query("state") businessId: string, @Query("code") code: string, @Res() res: Response) {
    if (this.cloudDriveService.isMock) {
      return res.json(await this.cloudDriveService.handleCallback(businessId, code));
    }

    const appUrl = process.env.APP_URL ?? "http://localhost:3000";
    try {
      await this.cloudDriveService.handleCallback(businessId, code);
      return res.redirect(`${appUrl}/admin/businesses?cloudDrive=connected&businessId=${encodeURIComponent(businessId)}`);
    } catch (error) {
      const reason = (error as Error).message;
      this.logger.error(`Cloud drive callback failed for business ${businessId}: ${reason}`);
      // These failures are usually actionable by the person who just clicked
      // connect ("create a subfolder named X"), so the reason travels back
      // rather than being flattened into a generic error flag. Capped so a
      // long provider message can't blow the URL length.
      return res.redirect(
        `${appUrl}/admin/businesses?cloudDrive=error&businessId=${encodeURIComponent(businessId)}` +
          `&reason=${encodeURIComponent(reason.slice(0, 300))}`
      );
    }
  }

  @ApiBearerAuth()
  @Roles(RoleName.SUPER_ADMIN, RoleName.ADMIN, RoleName.FINANCE)
  @Get("admin/businesses/:businessId/cloud-drive/connection")
  connection(@Param("businessId") businessId: string) {
    return this.cloudDriveService.getConnection(businessId);
  }

  @ApiBearerAuth()
  @Roles(RoleName.SUPER_ADMIN, RoleName.ADMIN, RoleName.FINANCE)
  @Post("admin/businesses/:businessId/cloud-drive/import")
  import(@Param("businessId") businessId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.cloudDriveService.triggerImport(businessId, user.id);
  }

  @ApiBearerAuth()
  @Roles(RoleName.SUPER_ADMIN, RoleName.ADMIN, RoleName.FINANCE)
  @Get("admin/businesses/:businessId/cloud-drive/import-logs")
  logs(@Param("businessId") businessId: string) {
    return this.cloudDriveService.listImportLogs(businessId);
  }
}
