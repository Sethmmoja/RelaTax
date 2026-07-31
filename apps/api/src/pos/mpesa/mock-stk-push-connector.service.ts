import { Injectable, Logger } from "@nestjs/common";
import { randomUUID } from "crypto";
import { StkPushConnector, StkPushRequest, StkPushResult } from "./stk-push-connector";

@Injectable()
export class MockStkPushConnector extends StkPushConnector {
  private readonly logger = new Logger(MockStkPushConnector.name);

  async initiate(request: StkPushRequest): Promise<StkPushResult> {
    const checkoutRequestId = `ws_CO_mock_${randomUUID()}`;
    this.logger.log(
      `[mock M-Pesa] STK push -> ${request.phoneNumber} for KES ${request.amount} (${request.accountReference}); checkoutRequestId=${checkoutRequestId}. Use POST /mpesa/simulate-callback to resolve it.`
    );
    return {
      merchantRequestId: `mock-merchant-${randomUUID()}`,
      checkoutRequestId,
      responseCode: "0",
      responseDescription: "Success. Request accepted for processing"
    };
  }
}
