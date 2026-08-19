-- AlterTable
ALTER TABLE "client" ADD COLUMN     "address" TEXT,
ADD COLUMN     "jobTitle" TEXT,
ADD COLUMN     "lastInteractionAt" TIMESTAMP(3),
ADD COLUMN     "website" TEXT;
