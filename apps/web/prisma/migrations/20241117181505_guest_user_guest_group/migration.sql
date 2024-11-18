/*
  Warnings:

  - You are about to drop the `Guest` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "GuestGroup" DROP CONSTRAINT "GuestGroup_userId_fkey";

-- DropTable
DROP TABLE "Guest";

-- CreateTable
CREATE TABLE "GuestUser" (
    "id" TEXT NOT NULL,
    "guestId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuestUser_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "GuestGroup" ADD CONSTRAINT "GuestGroup_userId_fkey" FOREIGN KEY ("userId") REFERENCES "GuestUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
