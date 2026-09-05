-- CreateTable
CREATE TABLE "GroupInviteLink" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroupInviteLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GroupInviteLink_token_key" ON "GroupInviteLink"("token");

-- CreateIndex
CREATE INDEX "GroupInviteLink_groupId_idx" ON "GroupInviteLink"("groupId");

-- AddForeignKey
ALTER TABLE "GroupInviteLink" ADD CONSTRAINT "GroupInviteLink_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

