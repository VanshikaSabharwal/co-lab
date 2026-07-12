/*
  Warnings:

  - Added the required column `userId` to the `ApprovedCr` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `RejectedCr` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ApprovedCr" ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "RejectedCr" ADD COLUMN     "userId" TEXT NOT NULL;
