-- Something in the diary that is not a job: a call, a viewing, a day off.
CREATE TABLE "event" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3),
    "allDay" BOOLEAN NOT NULL DEFAULT false,
    "location" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "projectId" TEXT,
    "clientId" TEXT,

    CONSTRAINT "event_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "event_workspaceId_startAt_idx" ON "event"("workspaceId", "startAt");

ALTER TABLE "event" ADD CONSTRAINT "event_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- The work can go away; the fact that it happened stays in the diary.
ALTER TABLE "event" ADD CONSTRAINT "event_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "event" ADD CONSTRAINT "event_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
