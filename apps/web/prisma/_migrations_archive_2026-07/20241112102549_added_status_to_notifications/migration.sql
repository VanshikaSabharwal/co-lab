/*
  Warnings:

  - Added the required column `status` to the `Notifications` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Notifications" ADD COLUMN     "status" TEXT NOT NULL;
