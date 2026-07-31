import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Public } from "../common/decorators/public.decorator";
import { BusinessMemberGuard } from "../common/guards/business-member.guard";
import type { AuthenticatedUser } from "../auth/auth.types";
import { SalesService } from "./sales.service";
import { CreateCashSaleDto } from "./dto/create-cash-sale.dto";
import { InitiateMpesaSaleDto } from "./dto/initiate-mpesa-sale.dto";
import { SimulateMpesaCallbackDto } from "./dto/simulate-mpesa-callback.dto";

@ApiTags("pos")
@Controller()
export class PosController {
  constructor(private salesService: SalesService) {}

  @ApiBearerAuth()
  @UseGuards(BusinessMemberGuard)
  @Post("businesses/:businessId/sales")
  createCashSale(
    @Param("businessId") businessId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCashSaleDto
  ) {
    return this.salesService.createCashSale(businessId, user.id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(BusinessMemberGuard)
  @Post("businesses/:businessId/sales/mpesa")
  initiateMpesaSale(
    @Param("businessId") businessId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: InitiateMpesaSaleDto
  ) {
    return this.salesService.initiateMpesaSale(businessId, user.id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(BusinessMemberGuard)
  @Get("businesses/:businessId/sales")
  listSales(@Param("businessId") businessId: string) {
    return this.salesService.listSales(businessId);
  }

  @ApiBearerAuth()
  @UseGuards(BusinessMemberGuard)
  @Get("businesses/:businessId/sales/:saleId")
  getSale(@Param("saleId") saleId: string) {
    return this.salesService.getSale(saleId);
  }

  /** Safaricom's webhook — no auth header to check, matches the QuickBooks/CloudDrive callback pattern. */
  @Public()
  @Post("mpesa/callback")
  async callback(@Body() payload: any) {
    await this.salesService.handleMpesaCallback(payload);
    return { ResultCode: 0, ResultDesc: "Accepted" };
  }

  /**
   * Dev-only: drives the same callback handler the real Safaricom webhook
   * would hit, so the whole M-Pesa flow is demonstrable/testable without
   * real Daraja credentials. Disabled once MPESA_CONNECTOR=safaricom.
   */
  @Public()
  @Post("mpesa/simulate-callback")
  async simulateCallback(@Body() dto: SimulateMpesaCallbackDto) {
    if (process.env.MPESA_CONNECTOR === "safaricom") {
      return { error: "simulate-callback is disabled when MPESA_CONNECTOR=safaricom" };
    }

    const payload = dto.success
      ? {
          Body: {
            stkCallback: {
              CheckoutRequestID: dto.checkoutRequestId,
              ResultCode: 0,
              CallbackMetadata: {
                Item: [{ Name: "MpesaReceiptNumber", Value: dto.mpesaReceiptNumber ?? `MOCK${Date.now()}` }]
              }
            }
          }
        }
      : { Body: { stkCallback: { CheckoutRequestID: dto.checkoutRequestId, ResultCode: 1 } } };

    await this.salesService.handleMpesaCallback(payload);
    return { received: true };
  }
}
