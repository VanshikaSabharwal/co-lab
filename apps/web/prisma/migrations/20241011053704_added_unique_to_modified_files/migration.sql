/*
  Warnings:

  - A unique constraint covering the columns `[path]` on the table `ModifiedFiles` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "ModifiedFiles_path_key" ON "ModifiedFiles"("path");
