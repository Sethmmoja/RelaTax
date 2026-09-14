import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { DocumentsService } from "./documents.service";
import { DocumentsController } from "./documents.controller";
import { DocumentsAdminController } from "./documents-admin.controller";
import { DocumentIndexingProcessor, DOCUMENT_INDEXING_QUEUE } from "./document-indexing.processor";
import { StorageService } from "./storage/storage.service";
import { S3StorageService } from "./storage/s3-storage.service";
import { AiModule } from "../ai/ai.module";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [
    AiModule,
    NotificationsModule,
    BullModule.registerQueue({
      name: DOCUMENT_INDEXING_QUEUE,
      // Parsing can fail transiently (storage hiccup, Redis blip); retry with
      // backoff before giving up. Completed jobs are pruned so the queue doesn't
      // accumulate one record per document forever.
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 5_000 },
        removeOnComplete: 500,
        removeOnFail: 1_000
      }
    })
  ],
  controllers: [DocumentsController, DocumentsAdminController],
  providers: [DocumentsService, DocumentIndexingProcessor, { provide: StorageService, useClass: S3StorageService }],
  exports: [DocumentsService, StorageService]
})
export class DocumentsModule {}
