-- AlterTable
ALTER TABLE "payroll_runs" ADD COLUMN     "reportDocumentId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "payroll_runs_reportDocumentId_key" ON "payroll_runs"("reportDocumentId");

-- AddForeignKey
ALTER TABLE "payroll_runs" ADD CONSTRAINT "payroll_runs_reportDocumentId_fkey" FOREIGN KEY ("reportDocumentId") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

