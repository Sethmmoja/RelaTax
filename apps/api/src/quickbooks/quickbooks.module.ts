import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { QuickBooksController } from "./quickbooks.controller";
import { QuickBooksService } from "./quickbooks.service";
import { QuickBooksProcessor } from "./quickbooks.processor";
import { QuickBooksConnector } from "./quickbooks-connector";
import { MockQuickBooksConnector } from "./mock-quickbooks-connector.service";

@Module({
  imports: [BullModule.registerQueue({ name: "quickbooks-sync" })],
  controllers: [QuickBooksController],
  providers: [
    QuickBooksService,
    QuickBooksProcessor,
    MockQuickBooksConnector,
    { provide: QuickBooksConnector, useExisting: MockQuickBooksConnector }
  ],
  exports: [QuickBooksService]
})
export class QuickBooksModule {}
