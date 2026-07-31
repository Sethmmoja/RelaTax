import { Module } from "@nestjs/common";
import { InvoicingService } from "./invoicing.service";
import { InvoicingController } from "./invoicing.controller";
import { DocumentsModule } from "../documents/documents.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { WhatsAppTransportModule } from "../whatsapp/whatsapp-transport.module";

@Module({
  imports: [DocumentsModule, NotificationsModule, WhatsAppTransportModule],
  controllers: [InvoicingController],
  providers: [InvoicingService],
  exports: [InvoicingService]
})
export class InvoicingModule {}
