/*
  Warnings:

  - You are about to drop the column `certificateIssued` on the `Registration` table. All the data in the column will be lost.
  - You are about to drop the column `certificateNumber` on the `Registration` table. All the data in the column will be lost.
  - You are about to drop the column `certificateUrl` on the `Registration` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[accessToken]` on the table `Registration` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Registration_certificateNumber_key";

-- AlterTable
ALTER TABLE "Registration" DROP COLUMN "certificateIssued",
DROP COLUMN "certificateNumber",
DROP COLUMN "certificateUrl",
ADD COLUMN     "accessToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Registration_accessToken_key" ON "Registration"("accessToken");
