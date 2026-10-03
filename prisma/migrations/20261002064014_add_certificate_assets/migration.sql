/*
  Warnings:

  - You are about to drop the column `authorizedSignatoryName` on the `Seminar` table. All the data in the column will be lost.
  - You are about to drop the column `certificateDuration` on the `Seminar` table. All the data in the column will be lost.
  - You are about to drop the column `certificateEnabled` on the `Seminar` table. All the data in the column will be lost.
  - You are about to drop the column `certificateSubtitle` on the `Seminar` table. All the data in the column will be lost.
  - You are about to drop the column `certificateTitle` on the `Seminar` table. All the data in the column will be lost.
  - You are about to drop the column `stampUrl` on the `Seminar` table. All the data in the column will be lost.
  - You are about to drop the column `trainerName` on the `Seminar` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Seminar" DROP COLUMN "authorizedSignatoryName",
DROP COLUMN "certificateDuration",
DROP COLUMN "certificateEnabled",
DROP COLUMN "certificateSubtitle",
DROP COLUMN "certificateTitle",
DROP COLUMN "stampUrl",
DROP COLUMN "trainerName",
ADD COLUMN     "authorizedSignaturePublicId" TEXT,
ADD COLUMN     "certificateStampPublicId" TEXT,
ADD COLUMN     "certificateStampUrl" TEXT,
ADD COLUMN     "trainerSignaturePublicId" TEXT;
