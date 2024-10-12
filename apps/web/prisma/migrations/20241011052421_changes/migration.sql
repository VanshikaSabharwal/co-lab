-- CreateTable
CREATE TABLE "Changes" (
    "id" SERIAL NOT NULL,
    "fileId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "lineNumber" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Changes_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Changes" ADD CONSTRAINT "Changes_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "ModifiedFiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
