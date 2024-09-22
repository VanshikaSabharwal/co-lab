/*
  Warnings:

  - Added the required column `isDelivered` to the `Message` table without a default value. This is not possible if the table is not empty.
  - Added the required column `recipientId` to the `Message` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "isDelivered" BOOLEAN NOT NULL,
ADD COLUMN     "recipientId" TEXT NOT NULL;
