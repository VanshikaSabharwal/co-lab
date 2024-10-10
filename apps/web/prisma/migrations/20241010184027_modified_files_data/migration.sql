-- DropForeignKey
ALTER TABLE "ModifiedFiles" DROP CONSTRAINT "ModifiedFiles_modifiedById_fkey";

-- AlterTable
ALTER TABLE "ModifiedFiles" ALTER COLUMN "modifiedById" DROP NOT NULL,
ALTER COLUMN "modifiedById" DROP DEFAULT;

-- AddForeignKey
ALTER TABLE "ModifiedFiles" ADD CONSTRAINT "ModifiedFiles_modifiedById_fkey" FOREIGN KEY ("modifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
