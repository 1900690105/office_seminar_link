/*
  Warnings:

  - You are about to drop the column `completionStampUrl` on the `Seminar` table. All the data in the column will be lost.
  - Made the column `seminarDate` on table `Seminar` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "Seminar_collegeName_idx";

-- DropIndex
DROP INDEX "Seminar_seminarDate_idx";

-- AlterTable
ALTER TABLE "Seminar" DROP COLUMN "completionStampUrl",
ADD COLUMN     "authorizedSignaturePublicId" TEXT,
ADD COLUMN     "duration" TEXT,
ADD COLUMN     "program" TEXT,
ADD COLUMN     "stampPublicId" TEXT,
ADD COLUMN     "stampUrl" TEXT,
ADD COLUMN     "subject" TEXT,
ADD COLUMN     "trainerSignaturePublicId" TEXT,
ALTER COLUMN "seminarDate" SET NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'DRAFT';
