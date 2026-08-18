-- CreateEnum
CREATE TYPE "AutomationStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "AutomationTrigger" AS ENUM ('PROJECT_CREATED', 'PROJECT_STAGE_CHANGED', 'CLIENT_CREATED', 'INVOICE_SENT', 'INVOICE_PAID');

-- CreateEnum
CREATE TYPE "AutomationAction" AS ENUM ('SEND_EMAIL', 'CREATE_TASK', 'MOVE_STAGE');

-- CreateEnum
CREATE TYPE "RunStatus" AS ENUM ('RUNNING', 'COMPLETED', 'CANCELLED', 'FAILED');

-- CreateEnum
CREATE TYPE "RunStepStatus" AS ENUM ('PENDING', 'DONE', 'FAILED');

-- CreateTable
CREATE TABLE "automation" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "AutomationStatus" NOT NULL DEFAULT 'INACTIVE',
    "trigger" "AutomationTrigger" NOT NULL,
    "triggerStage" "ProjectStage",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "workspaceId" TEXT NOT NULL,

    CONSTRAINT "automation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automation_step" (
    "id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "action" "AutomationAction" NOT NULL,
    "delayMinutes" INTEGER NOT NULL DEFAULT 0,
    "subject" TEXT,
    "body" TEXT,
    "targetStage" "ProjectStage",
    "automationId" TEXT NOT NULL,

    CONSTRAINT "automation_step_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automation_run" (
    "id" TEXT NOT NULL,
    "status" "RunStatus" NOT NULL DEFAULT 'RUNNING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "workspaceId" TEXT NOT NULL,
    "automationId" TEXT NOT NULL,
    "projectId" TEXT,
    "clientId" TEXT,

    CONSTRAINT "automation_run_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automation_run_step" (
    "id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "status" "RunStepStatus" NOT NULL DEFAULT 'PENDING',
    "dueAt" TIMESTAMP(3) NOT NULL,
    "executedAt" TIMESTAMP(3),
    "detail" TEXT,
    "runId" TEXT NOT NULL,
    "stepId" TEXT NOT NULL,

    CONSTRAINT "automation_run_step_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "automation_workspaceId_status_idx" ON "automation"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "automation_step_automationId_position_idx" ON "automation_step"("automationId", "position");

-- CreateIndex
CREATE INDEX "automation_run_workspaceId_status_idx" ON "automation_run"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "automation_run_automationId_idx" ON "automation_run"("automationId");

-- CreateIndex
CREATE INDEX "automation_run_step_status_dueAt_idx" ON "automation_run_step"("status", "dueAt");

-- CreateIndex
CREATE INDEX "automation_run_step_runId_position_idx" ON "automation_run_step"("runId", "position");

-- AddForeignKey
ALTER TABLE "automation" ADD CONSTRAINT "automation_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_step" ADD CONSTRAINT "automation_step_automationId_fkey" FOREIGN KEY ("automationId") REFERENCES "automation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_run" ADD CONSTRAINT "automation_run_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_run" ADD CONSTRAINT "automation_run_automationId_fkey" FOREIGN KEY ("automationId") REFERENCES "automation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_run" ADD CONSTRAINT "automation_run_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_run" ADD CONSTRAINT "automation_run_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_run_step" ADD CONSTRAINT "automation_run_step_runId_fkey" FOREIGN KEY ("runId") REFERENCES "automation_run"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_run_step" ADD CONSTRAINT "automation_run_step_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "automation_step"("id") ON DELETE CASCADE ON UPDATE CASCADE;
