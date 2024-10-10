-- AlterTable
ALTER TABLE "ModifiedFiles" ADD COLUMN     "modifiedById" TEXT NOT NULL DEFAULT '';

-- AddForeignKey
ALTER TABLE "ModifiedFiles" ADD CONSTRAINT "ModifiedFiles_modifiedById_fkey" FOREIGN KEY ("modifiedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
