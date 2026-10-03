/*
  Warnings:

  - You are about to drop the column `authorizedSignaturePublicId` on the `Seminar` table. All the data in the column will be lost.
  - You are about to drop the column `certificateStampPublicId` on the `Seminar` table. All the data in the column will be lost.
  - You are about to drop the column `certificateStampUrl` on the `Seminar` table. All the data in the column will be lost.
  - You are about to drop the column `trainerSignaturePublicId` on the `Seminar` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Seminar" DROP COLUMN "authorizedSignaturePublicId",
DROP COLUMN "certificateStampPublicId",
DROP COLUMN "certificateStampUrl",
DROP COLUMN "trainerSignaturePublicId",
ADD COLUMN     "completionStampUrl" TEXT,
ALTER COLUMN "seminarDate" DROP NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'PUBLISHED';

-- CreateIndex
CREATE INDEX "Seminar_collegeName_idx" ON "Seminar"("collegeName");

-- CreateIndex
CREATE INDEX "Seminar_seminarDate_idx" ON "Seminar"("seminarDate");
