import { Module } from "@nestjs/common";
import { WhatsAppController } from "./whatsapp.controller";
import { WhatsAppConversationEngine } from "./whatsapp-conversation.engine";
import { WhatsAppTransportModule } from "./whatsapp-transport.module";
import { AuthModule } from "../auth/auth.module";
import { BusinessesModule } from "../businesses/businesses.module";
import { ReportsModule } from "../reports/reports.module";
import { TaxesModule } from "../taxes/taxes.module";
import { DocumentsModule } from "../documents/documents.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { AiModule } from "../ai/ai.module";
import { InvoicingModule } from "../invoicing/invoicing.module";

@Module({
  imports: [
    AuthModule,
    BusinessesModule,
    ReportsModule,
    TaxesModule,
    DocumentsModule,
    NotificationsModule,
    AiModule,
    WhatsAppTransportModule,
    InvoicingModule
  ],
  controllers: [WhatsAppController],
  providers: [WhatsAppConversationEngine]
})
export class WhatsAppModule {}
