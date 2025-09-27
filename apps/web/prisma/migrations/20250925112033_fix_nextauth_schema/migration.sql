-- DropIndex
DROP INDEX "File_userId_key";

-- DropIndex
DROP INDEX "Invite_phone_key";

-- DropIndex
DROP INDEX "ModifiedFiles_userId_key";

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "phone" DROP NOT NULL,
ALTER COLUMN "image" DROP NOT NULL,
ALTER COLUMN "image" DROP DEFAULT;
