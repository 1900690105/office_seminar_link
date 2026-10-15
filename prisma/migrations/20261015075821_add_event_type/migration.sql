-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('SEMINAR', 'WORKSHOP');

-- AlterTable
ALTER TABLE "Seminar" ADD COLUMN     "eventType" "EventType" NOT NULL DEFAULT 'SEMINAR';
