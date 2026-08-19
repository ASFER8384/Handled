-- CreateEnum
CREATE TYPE "StageGroup" AS ENUM ('OPPORTUNITY', 'PROJECT');

-- CreateTable
CREATE TABLE "pipeline_stage" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "group" "StageGroup" NOT NULL DEFAULT 'OPPORTUNITY',
    "position" INTEGER NOT NULL,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "workspaceId" TEXT NOT NULL,

    CONSTRAINT "pipeline_stage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pipeline_stage_workspaceId_position_idx" ON "pipeline_stage"("workspaceId", "position");

-- AddForeignKey
ALTER TABLE "pipeline_stage" ADD CONSTRAINT "pipeline_stage_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed every existing workspace with the default pipeline. The legacy enum
-- value each stage replaces is carried in "legacy" so the backfill below can
-- map projects and automations onto the new rows, then dropped.
ALTER TABLE "pipeline_stage" ADD COLUMN "legacy" TEXT;

INSERT INTO "pipeline_stage" ("id", "name", "group", "position", "hidden", "updatedAt", "workspaceId", "legacy")
SELECT
    md5(w."id" || d.legacy)::text,
    d.name,
    d."group"::"StageGroup",
    d.position,
    d.hidden,
    CURRENT_TIMESTAMP,
    w."id",
    d.legacy
FROM "workspace" w
CROSS JOIN (VALUES
    ('New',         'OPPORTUNITY', 0, false, 'INQUIRY'),
    ('Discovery',   'OPPORTUNITY', 1, false, 'DISCOVERY'),
    ('Proposal',    'OPPORTUNITY', 2, false, 'PROPOSAL_SENT'),
    ('Contract signed', 'OPPORTUNITY', 3, false, 'BOOKED'),
    ('Kick off',    'PROJECT',     4, false, 'KICK_OFF'),
    ('Planning',    'PROJECT',     5, false, 'PLANNING'),
    ('Delivery',    'PROJECT',     6, false, 'IN_PROGRESS'),
    ('Complete',    'PROJECT',     7, false, 'COMPLETED'),
    ('Archived',    'PROJECT',     8, true,  'ARCHIVED')
) AS d(name, "group", position, hidden, legacy);

-- AlterTable: project
ALTER TABLE "project" ADD COLUMN "stageId" TEXT;

UPDATE "project" p
SET "stageId" = s."id"
FROM "pipeline_stage" s
WHERE s."workspaceId" = p."workspaceId" AND s."legacy" = p."stage"::text;

DROP INDEX IF EXISTS "project_workspaceId_stage_idx";
ALTER TABLE "project" DROP COLUMN "stage";
CREATE INDEX "project_workspaceId_stageId_idx" ON "project"("workspaceId", "stageId");
ALTER TABLE "project" ADD CONSTRAINT "project_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "pipeline_stage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable: automation trigger
ALTER TABLE "automation" ADD COLUMN "triggerStageId" TEXT;

UPDATE "automation" a
SET "triggerStageId" = s."id"
FROM "pipeline_stage" s
WHERE s."workspaceId" = a."workspaceId" AND s."legacy" = a."triggerStage"::text;

ALTER TABLE "automation" DROP COLUMN "triggerStage";
ALTER TABLE "automation" ADD CONSTRAINT "automation_triggerStageId_fkey" FOREIGN KEY ("triggerStageId") REFERENCES "pipeline_stage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable: automation step target
ALTER TABLE "automation_step" ADD COLUMN "targetStageId" TEXT;

UPDATE "automation_step" st
SET "targetStageId" = s."id"
FROM "automation" a, "pipeline_stage" s
WHERE a."id" = st."automationId"
  AND s."workspaceId" = a."workspaceId"
  AND s."legacy" = st."targetStage"::text;

ALTER TABLE "automation_step" DROP COLUMN "targetStage";
ALTER TABLE "automation_step" ADD CONSTRAINT "automation_step_targetStageId_fkey" FOREIGN KEY ("targetStageId") REFERENCES "pipeline_stage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable: run step snapshot
ALTER TABLE "automation_run_step" ADD COLUMN "targetStageId" TEXT,
ADD COLUMN "targetStageName" TEXT;

UPDATE "automation_run_step" rs
SET "targetStageId" = s."id", "targetStageName" = s."name"
FROM "automation_run" r, "pipeline_stage" s
WHERE r."id" = rs."runId"
  AND s."workspaceId" = r."workspaceId"
  AND s."legacy" = rs."targetStage"::text;

ALTER TABLE "automation_run_step" DROP COLUMN "targetStage";
ALTER TABLE "automation_run_step" ADD CONSTRAINT "automation_run_step_targetStageId_fkey" FOREIGN KEY ("targetStageId") REFERENCES "pipeline_stage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- The mapping column has done its job.
ALTER TABLE "pipeline_stage" DROP COLUMN "legacy";

-- DropEnum
DROP TYPE "ProjectStage";
