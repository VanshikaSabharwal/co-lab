/*
  Warnings:

  - You are about to drop the column `message` on the `Notifications` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `Notifications` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Notifications" DROP COLUMN "message",
DROP COLUMN "status";
