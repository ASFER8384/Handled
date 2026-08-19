-- AlterTable
ALTER TABLE "project" ADD COLUMN     "allDay" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "endsAt" TIMESTAMP(3),
ADD COLUMN     "leadSource" TEXT,
ADD COLUMN     "timezone" TEXT,
ADD COLUMN     "type" TEXT;
