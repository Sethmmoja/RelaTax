import { BullModule } from "@nestjs/bullmq";
import { Logger, Module } from "@nestjs/common";
import { CloudDriveController } from "./cloud-drive.controller";
import { CloudDriveService } from "./cloud-drive.service";
import { CloudDriveProcessor } from "./cloud-drive.processor";
import { CloudDriveConnector } from "./cloud-drive-connector";
import { MockCloudDriveConnector } from "./mock-cloud-drive-connector.service";
import { GoogleDriveConnector } from "./google-drive-connector.service";
import { DocumentsModule } from "../documents/documents.module";

@Module({
  imports: [BullModule.registerQueue({ name: "cloud-drive-import" }), DocumentsModule],
  controllers: [CloudDriveController],
  providers: [
    CloudDriveService,
    CloudDriveProcessor,
    MockCloudDriveConnector,
    GoogleDriveConnector,
    {
      provide: CloudDriveConnector,
      // Real Google Drive only when explicitly selected and an OAuth client is configured;
      // otherwise the offline mock so local dev needs no credentials.
      useFactory: (mock: MockCloudDriveConnector, googleDrive: GoogleDriveConnector) => {
        const useGoogleDrive =
          process.env.CLOUD_DRIVE_CONNECTOR === "google_drive" &&
          !!process.env.CLOUD_DRIVE_CLIENT_ID &&
          !!process.env.CLOUD_DRIVE_CLIENT_SECRET;
        new Logger("CloudDriveModule").log(`Cloud drive connector: ${useGoogleDrive ? "google_drive" : "mock"}`);
        return useGoogleDrive ? googleDrive : mock;
      },
      inject: [MockCloudDriveConnector, GoogleDriveConnector]
    }
  ],
  exports: [CloudDriveService]
})
export class CloudDriveModule {}
