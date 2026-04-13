-- AlterTable: Add patientId to WebhookEvent for DSAR cascade deletion
ALTER TABLE "webhook_events" ADD COLUMN "patientId" TEXT;

-- CreateIndex
CREATE INDEX "webhook_events_patientId_idx" ON "webhook_events"("patientId");

-- AddForeignKey
ALTER TABLE "webhook_events" ADD CONSTRAINT "webhook_events_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
