-- AlterTable
ALTER TABLE "documents" ADD COLUMN     "externalFileId" TEXT;

-- AlterTable
ALTER TABLE "sync_logs" ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'quickbooks';

-- CreateTable
CREATE TABLE "cloud_drive_connections" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "folderId" TEXT,
    "folderName" TEXT,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cloud_drive_connections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cloud_drive_connections_businessId_key" ON "cloud_drive_connections"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "documents_externalFileId_key" ON "documents"("externalFileId");

-- AddForeignKey
ALTER TABLE "cloud_drive_connections" ADD CONSTRAINT "cloud_drive_connections_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

