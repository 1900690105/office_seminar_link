-- AlterTable
ALTER TABLE "Seminar" ADD COLUMN     "authorizedSignatoryName" TEXT,
ADD COLUMN     "authorizedSignatureUrl" TEXT,
ADD COLUMN     "certificateDuration" TEXT,
ADD COLUMN     "certificateEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "certificateSubtitle" TEXT NOT NULL DEFAULT 'OF SEMINAR PARTICIPATION',
ADD COLUMN     "certificateTitle" TEXT NOT NULL DEFAULT 'CERTIFICATE',
ADD COLUMN     "stampUrl" TEXT,
ADD COLUMN     "trainerName" TEXT,
ADD COLUMN     "trainerSignatureUrl" TEXT;
