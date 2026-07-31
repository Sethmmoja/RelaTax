import { Controller, Get, Logger, Param, Post, Query, Res, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import { RoleName } from "@relatax/types";
import { Public } from "../common/decorators/public.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { BusinessMemberGuard } from "../common/guards/business-member.guard";
import { QuickBooksService } from "./quickbooks.service";

@ApiTags("quickbooks")
@Controller()
export class QuickBooksController {
  private readonly logger = new Logger(QuickBooksController.name);

  constructor(private quickBooksService: QuickBooksService) {}

  @ApiBearerAuth()
  @Roles(RoleName.SUPER_ADMIN, RoleName.ADMIN, RoleName.FINANCE)
  @UseGuards(BusinessMemberGuard)
  @Get("businesses/:businessId/quickbooks/connect")
  connect(@Param("businessId") businessId: string) {
    return { url: this.quickBooksService.getAuthorizationUrl(businessId) };
  }

  @ApiBearerAuth()
  @Roles(RoleName.SUPER_ADMIN, RoleName.ADMIN, RoleName.FINANCE)
  @Get("admin/businesses/:businessId/quickbooks/connection")
  connection(@Param("businessId") businessId: string) {
    return this.quickBooksService.getConnection(businessId);
  }

  /**
   * Intuit redirects the user's real browser here after consent — must never
   * return the connection object (it holds access/refresh tokens), so it
   * redirects into the admin app instead. The mock connector's fabricated
   * tokens have nothing to protect, so the dev/demo flow (the admin UI calling
   * this endpoint directly to simulate a connection) still gets a plain JSON
   * response, matching how it's already being called.
   */
  @Public()
  @Get("quickbooks/callback")
  async callback(@Query("state") businessId: string, @Query("code") code: string, @Res() res: Response) {
    if (this.quickBooksService.isMock) {
      return res.json(await this.quickBooksService.handleCallback(businessId, code));
    }

    const appUrl = process.env.APP_URL ?? "http://localhost:3000";
    try {
      await this.quickBooksService.handleCallback(businessId, code);
      return res.redirect(`${appUrl}/admin/businesses?quickbooks=connected&businessId=${encodeURIComponent(businessId)}`);
    } catch (error) {
      this.logger.error(`QuickBooks callback failed for business ${businessId}: ${(error as Error).message}`);
      return res.redirect(`${appUrl}/admin/businesses?quickbooks=error&businessId=${encodeURIComponent(businessId)}`);
    }
  }

  @ApiBearerAuth()
  @Roles(RoleName.SUPER_ADMIN, RoleName.ADMIN, RoleName.FINANCE)
  @Post("admin/businesses/:businessId/quickbooks/sync")
  sync(@Param("businessId") businessId: string) {
    return this.quickBooksService.triggerSync(businessId);
  }

  @ApiBearerAuth()
  @Roles(RoleName.SUPER_ADMIN, RoleName.ADMIN, RoleName.FINANCE)
  @Get("admin/businesses/:businessId/quickbooks/sync-logs")
  logs(@Param("businessId") businessId: string) {
    return this.quickBooksService.listSyncLogs(businessId);
  }
}
