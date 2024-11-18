/*
  Warnings:

  - You are about to drop the `GuestUser` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "GuestGroup" DROP CONSTRAINT "GuestGroup_userId_fkey";

-- DropTable
DROP TABLE "GuestUser";

-- CreateTable
CREATE TABLE "Guest" (
    "id" TEXT NOT NULL,
    "guestId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Guest_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "GuestGroup" ADD CONSTRAINT "GuestGroup_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Guest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
