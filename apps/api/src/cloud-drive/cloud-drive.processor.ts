import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { CloudDriveService } from "./cloud-drive.service";

@Processor("cloud-drive-import")
export class CloudDriveProcessor extends WorkerHost {
  private readonly logger = new Logger(CloudDriveProcessor.name);

  constructor(private cloudDriveService: CloudDriveService) {
    super();
  }

  async process(job: Job<{ businessId: string; connectionId: string; triggeredByUserId: string }>): Promise<void> {
    this.logger.log(`Importing cloud drive files for business ${job.data.businessId}`);
    await this.cloudDriveService.runImport(job.data.businessId, job.data.connectionId, job.data.triggeredByUserId);
  }
}
