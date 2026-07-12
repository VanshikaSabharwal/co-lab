/*
  Warnings:

  - A unique constraint covering the columns `[userId,groupId]` on the table `ModifiedFiles` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "ModifiedFiles_userId_groupId_key" ON "ModifiedFiles"("userId", "groupId");
