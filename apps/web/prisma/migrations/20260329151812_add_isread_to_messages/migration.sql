-- AlterTable
ALTER TABLE "Messages" ADD COLUMN     "isRead" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Messages_chatId_idx" ON "Messages"("chatId");

-- CreateIndex
CREATE INDEX "Messages_recipientId_isRead_idx" ON "Messages"("recipientId", "isRead");
