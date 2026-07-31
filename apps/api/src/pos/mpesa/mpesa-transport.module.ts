import { Logger, Module } from "@nestjs/common";
import { StkPushConnector } from "./stk-push-connector";
import { MockStkPushConnector } from "./mock-stk-push-connector.service";
import { SafaricomStkPushConnector } from "./safaricom-stk-push-connector.service";

/**
 * Leaf module owning just the StkPushConnector provider — same shape as
 * WhatsAppTransportModule, so other modules can depend on it without pulling
 * in the rest of the POS module.
 */
@Module({
  providers: [
    MockStkPushConnector,
    SafaricomStkPushConnector,
    {
      provide: StkPushConnector,
      useFactory: (mock: MockStkPushConnector, safaricom: SafaricomStkPushConnector) => {
        const useSafaricom = process.env.MPESA_CONNECTOR === "safaricom";
        new Logger("MpesaTransportModule").log(`M-Pesa connector: ${useSafaricom ? "safaricom (Daraja)" : "mock"}`);
        return useSafaricom ? safaricom : mock;
      },
      inject: [MockStkPushConnector, SafaricomStkPushConnector]
    }
  ],
  exports: [StkPushConnector]
})
export class MpesaTransportModule {}
