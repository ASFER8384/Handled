-- A task now says who it is for, and whether its due time was set.
ALTER TABLE "task"
  ADD COLUMN IF NOT EXISTS "dueHasTime" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "assigneeId" TEXT;

CREATE INDEX IF NOT EXISTS "task_projectId_idx" ON "task" ("projectId");

ALTER TABLE "task" DROP CONSTRAINT IF EXISTS "task_assigneeId_fkey";
ALTER TABLE "task"
  ADD CONSTRAINT "task_assigneeId_fkey" FOREIGN KEY ("assigneeId")
  REFERENCES "user" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
