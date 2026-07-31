import { Logger, Module } from "@nestjs/common";
import { WhatsAppTransport } from "./whatsapp-transport";
import { MockWhatsAppTransport } from "./mock-whatsapp-transport.service";
import { MetaWhatsAppTransport } from "./meta-whatsapp-transport.service";

/**
 * Leaf module owning just the WhatsAppTransport provider — no imports of its
 * own, so both WhatsAppModule and NotificationsModule can depend on it
 * without a circular dependency (WhatsAppModule already imports
 * NotificationsModule for the conversation engine's report/notification flows).
 */
@Module({
  providers: [
    MockWhatsAppTransport,
    MetaWhatsAppTransport,
    {
      provide: WhatsAppTransport,
      useFactory: (mock: MockWhatsAppTransport, meta: MetaWhatsAppTransport) => {
        const useMeta =
          process.env.WHATSAPP_TRANSPORT === "meta" &&
          !!process.env.WHATSAPP_ACCESS_TOKEN &&
          !!process.env.WHATSAPP_PHONE_NUMBER_ID;
        new Logger("WhatsAppTransportModule").log(`WhatsApp transport: ${useMeta ? "meta (Cloud API)" : "mock"}`);
        return useMeta ? meta : mock;
      },
      inject: [MockWhatsAppTransport, MetaWhatsAppTransport]
    }
  ],
  exports: [WhatsAppTransport, MockWhatsAppTransport]
})
export class WhatsAppTransportModule {}
