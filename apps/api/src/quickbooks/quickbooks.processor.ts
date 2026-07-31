import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { QuickBooksService } from "./quickbooks.service";

@Processor("quickbooks-sync")
export class QuickBooksProcessor extends WorkerHost {
  private readonly logger = new Logger(QuickBooksProcessor.name);

  constructor(private quickBooksService: QuickBooksService) {
    super();
  }

  async process(job: Job<{ businessId: string; connectionId: string }>): Promise<void> {
    this.logger.log(`Running QuickBooks sync for business ${job.data.businessId}`);
    await this.quickBooksService.runSync(job.data.businessId, job.data.connectionId);
  }
}
