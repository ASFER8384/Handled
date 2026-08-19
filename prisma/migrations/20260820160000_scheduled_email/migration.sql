-- An email can now wait for a send time of its own.
ALTER TYPE "MessageStatus" ADD VALUE IF NOT EXISTS 'SCHEDULED' AFTER 'DRAFT';

ALTER TABLE "project_message" ADD COLUMN IF NOT EXISTS "scheduledFor" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "project_message_status_scheduledFor_idx"
  ON "project_message" ("status", "scheduledFor");
