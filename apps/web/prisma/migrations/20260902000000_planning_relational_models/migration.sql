-- CreateTable
CREATE TABLE "PlanningColumn" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlanningColumn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanningTask" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "columnId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "position" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "color" TEXT,
    "milestoneId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanningTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanningAssignee" (
    "taskId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "PlanningAssignee_pkey" PRIMARY KEY ("taskId","userId")
);

-- CreateTable
CREATE TABLE "PlanningMilestone" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "startDate" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3) NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlanningMilestone_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlanningColumn_groupId_position_idx" ON "PlanningColumn"("groupId", "position");

-- CreateIndex
CREATE INDEX "PlanningTask_groupId_idx" ON "PlanningTask"("groupId");

-- CreateIndex
CREATE INDEX "PlanningTask_columnId_position_idx" ON "PlanningTask"("columnId", "position");

-- CreateIndex
CREATE INDEX "PlanningTask_milestoneId_idx" ON "PlanningTask"("milestoneId");

-- CreateIndex
CREATE INDEX "PlanningAssignee_userId_idx" ON "PlanningAssignee"("userId");

-- CreateIndex
CREATE INDEX "PlanningMilestone_groupId_idx" ON "PlanningMilestone"("groupId");

-- AddForeignKey
ALTER TABLE "PlanningColumn" ADD CONSTRAINT "PlanningColumn_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanningTask" ADD CONSTRAINT "PlanningTask_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanningTask" ADD CONSTRAINT "PlanningTask_columnId_fkey" FOREIGN KEY ("columnId") REFERENCES "PlanningColumn"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanningTask" ADD CONSTRAINT "PlanningTask_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "PlanningMilestone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanningAssignee" ADD CONSTRAINT "PlanningAssignee_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "PlanningTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanningAssignee" ADD CONSTRAINT "PlanningAssignee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanningMilestone" ADD CONSTRAINT "PlanningMilestone_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

