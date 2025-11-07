/*
  Warnings:

  - Added the required column `sshKey` to the `Group` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Group" ADD COLUMN     "sshKey" TEXT NOT NULL;
