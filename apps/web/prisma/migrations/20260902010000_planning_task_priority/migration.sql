-- CreateEnum
CREATE TYPE "PlanningPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- AlterTable
ALTER TABLE "PlanningTask" ADD COLUMN     "priority" "PlanningPriority";

