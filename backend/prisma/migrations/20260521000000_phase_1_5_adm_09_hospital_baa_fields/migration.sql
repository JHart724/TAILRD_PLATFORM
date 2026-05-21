-- AlterTable
ALTER TABLE "hospitals" ADD COLUMN     "baaExecuted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "baaExecutedAt" TIMESTAMP(3),
ADD COLUMN     "signedBaaS3Key" TEXT,
ADD COLUMN     "signedBaaUploadedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "idx_hospital_baa_executed" ON "hospitals"("baaExecuted");

-- CreateIndex
CREATE INDEX "idx_hospital_baa_executed_at" ON "hospitals"("baaExecutedAt");

