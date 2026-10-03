/*
  Warnings:

  - You are about to drop the column `accessToken` on the `Registration` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[certificateNumber]` on the table `Registration` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Registration_accessToken_key";

-- AlterTable
ALTER TABLE "Registration" DROP COLUMN "accessToken",
ADD COLUMN     "certificateIssued" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "certificateNumber" TEXT,
ADD COLUMN     "certificateUrl" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Registration_certificateNumber_key" ON "Registration"("certificateNumber");
