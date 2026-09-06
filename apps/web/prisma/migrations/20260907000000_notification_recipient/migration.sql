-- AlterTable
ALTER TABLE "Notifications" ADD COLUMN IF NOT EXISTS "recipientId" TEXT;
ALTER TABLE "Notifications" ADD COLUMN IF NOT EXISTS "type" TEXT;
ALTER TABLE "Notifications" ADD COLUMN IF NOT EXISTS "readAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Notifications_recipientId_readAt_idx" ON "Notifications"("recipientId", "readAt");
CREATE INDEX IF NOT EXISTS "Notifications_ownerId_idx" ON "Notifications"("ownerId");
