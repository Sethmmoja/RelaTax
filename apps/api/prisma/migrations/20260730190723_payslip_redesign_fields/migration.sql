-- AlterTable
ALTER TABLE "employees" ADD COLUMN     "bankAccountNumber" TEXT,
ADD COLUMN     "bankName" TEXT,
ADD COLUMN     "nationalId" TEXT,
ADD COLUMN     "staffNo" TEXT;

-- AlterTable
ALTER TABLE "payslips" ADD COLUMN     "nssfTier1" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "nssfTier2" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "payeBeforeRelief" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "personalRelief" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "taxablePay" DECIMAL(65,30) NOT NULL DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX "employees_businessId_staffNo_key" ON "employees"("businessId", "staffNo");

