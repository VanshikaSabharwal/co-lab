/*
  Warnings:

  - The primary key for the `Messages` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `Messages` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `chatId` to the `Messages` table without a default value. This is not possible if the table is not empty.
  - Added the required column `recipientId` to the `Messages` table without a default value. This is not possible if the table is not empty.
  - Added the required column `senderId` to the `Messages` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Messages" DROP CONSTRAINT "Messages_pkey",
ADD COLUMN     "chatId" TEXT NOT NULL,
ADD COLUMN     "recipientId" TEXT NOT NULL,
ADD COLUMN     "senderId" TEXT NOT NULL,
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "Messages_pkey" PRIMARY KEY ("id");
