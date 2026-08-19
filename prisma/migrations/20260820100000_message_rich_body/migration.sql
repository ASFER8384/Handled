-- A message can now be written with formatting, carry attachments, answer an
-- earlier message, and be parked as a draft instead of sent.
ALTER TYPE "MessageStatus" ADD VALUE IF NOT EXISTS 'DRAFT' BEFORE 'QUEUED';

ALTER TABLE "project_message"
  ADD COLUMN IF NOT EXISTS "bodyHtml" TEXT,
  ADD COLUMN IF NOT EXISTS "attachments" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS "replyToId" TEXT;

ALTER TABLE "project_message"
  DROP CONSTRAINT IF EXISTS "project_message_replyToId_fkey";

ALTER TABLE "project_message"
  ADD CONSTRAINT "project_message_replyToId_fkey"
  FOREIGN KEY ("replyToId") REFERENCES "project_message"("id") ON DELETE SET NULL ON UPDATE CASCADE;
