/*
  Warnings:

  - Added the required column `action` to the `automation_run_step` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "automation_run_step" DROP CONSTRAINT "automation_run_step_stepId_fkey";

-- AlterTable
ALTER TABLE "automation_run_step" ADD COLUMN     "action" "AutomationAction" NOT NULL,
ADD COLUMN     "body" TEXT,
ADD COLUMN     "subject" TEXT,
ADD COLUMN     "targetStage" "ProjectStage",
ALTER COLUMN "stepId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "automation_run_step" ADD CONSTRAINT "automation_run_step_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "automation_step"("id") ON DELETE SET NULL ON UPDATE CASCADE;
