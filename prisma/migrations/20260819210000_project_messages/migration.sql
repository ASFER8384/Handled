-- Emails written from a project, kept whether or not a provider delivered them.
CREATE TYPE "MessageStatus" AS ENUM ('QUEUED', 'SENT', 'FAILED');

CREATE TABLE "project_message" (
  "id" TEXT NOT NULL,
  "to" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "status" "MessageStatus" NOT NULL DEFAULT 'QUEUED',
  "detail" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sentAt" TIMESTAMP(3),
  "projectId" TEXT NOT NULL,
  CONSTRAINT "project_message_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "project_message_projectId_createdAt_idx" ON "project_message"("projectId", "createdAt");

ALTER TABLE "project_message" ADD CONSTRAINT "project_message_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
