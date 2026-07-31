import { Module } from "@nestjs/common";
import { DocumentsService } from "./documents.service";
import { DocumentsController } from "./documents.controller";
import { StorageService } from "./storage/storage.service";
import { S3StorageService } from "./storage/s3-storage.service";
import { AiModule } from "../ai/ai.module";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [AiModule, NotificationsModule],
  controllers: [DocumentsController],
  providers: [DocumentsService, { provide: StorageService, useClass: S3StorageService }],
  exports: [DocumentsService, StorageService]
})
export class DocumentsModule {}
