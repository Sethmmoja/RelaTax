import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { NotificationsService } from "./notifications.service";
import { NotificationsProcessor } from "./notifications.processor";
import { NotificationsController } from "./notifications.controller";
import { EmailModule } from "../email/email.module";
import { WhatsAppTransportModule } from "../whatsapp/whatsapp-transport.module";

@Module({
  imports: [BullModule.registerQueue({ name: "notifications" }), EmailModule, WhatsAppTransportModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsProcessor],
  exports: [NotificationsService]
})
export class NotificationsModule {}
