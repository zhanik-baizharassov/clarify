-- AlterTable
ALTER TABLE "Place" ADD COLUMN     "companyId" TEXT,
ADD COLUMN     "workHours" TEXT;

-- CreateIndex
CREATE INDEX "Place_companyId_idx" ON "Place"("companyId");

-- AddForeignKey
ALTER TABLE "Place" ADD CONSTRAINT "Place_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
