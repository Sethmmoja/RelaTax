import { Module } from "@nestjs/common";
import { ContactController } from "./contact.controller";
import { ContactService } from "./contact.service";
import { EmailModule } from "../email/email.module";
import { WhatsAppTransportModule } from "../whatsapp/whatsapp-transport.module";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [EmailModule, WhatsAppTransportModule, NotificationsModule],
  controllers: [ContactController],
  providers: [ContactService]
})
export class ContactModule {}
