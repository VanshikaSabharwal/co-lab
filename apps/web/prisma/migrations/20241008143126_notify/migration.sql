/*
  Warnings:

  - Added the required column `ownerId` to the `Notifications` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ownerName` to the `Notifications` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Notifications" ADD COLUMN     "ownerId" TEXT NOT NULL,
ADD COLUMN     "ownerName" TEXT NOT NULL;
