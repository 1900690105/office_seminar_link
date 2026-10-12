-- AlterTable
ALTER TABLE "Seminar" ADD COLUMN     "authorizedSignatureStaffId" TEXT,
ADD COLUMN     "trainerSignatureStaffId" TEXT;

-- CreateTable
CREATE TABLE "StaffSignature" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT,
    "imageUrl" TEXT NOT NULL,
    "publicId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffSignature_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StaffSignature_isActive_idx" ON "StaffSignature"("isActive");

-- CreateIndex
CREATE INDEX "StaffSignature_name_idx" ON "StaffSignature"("name");

-- AddForeignKey
ALTER TABLE "Seminar" ADD CONSTRAINT "Seminar_trainerSignatureStaffId_fkey" FOREIGN KEY ("trainerSignatureStaffId") REFERENCES "StaffSignature"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Seminar" ADD CONSTRAINT "Seminar_authorizedSignatureStaffId_fkey" FOREIGN KEY ("authorizedSignatureStaffId") REFERENCES "StaffSignature"("id") ON DELETE SET NULL ON UPDATE CASCADE;
