-- AlterTable
ALTER TABLE "File" ADD COLUMN     "ownerId" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "ownerName" TEXT NOT NULL DEFAULT '';
