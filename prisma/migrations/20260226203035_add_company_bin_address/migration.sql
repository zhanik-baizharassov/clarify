/*
  Warnings:

  - A unique constraint covering the columns `[bin]` on the table `Company` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "address" TEXT,
ADD COLUMN     "bin" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Company_bin_key" ON "Company"("bin");

-- CreateIndex
CREATE INDEX "Company_ownerId_idx" ON "Company"("ownerId");
