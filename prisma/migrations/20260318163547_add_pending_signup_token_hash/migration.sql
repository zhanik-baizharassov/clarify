/*
  Warnings:

  - A unique constraint covering the columns `[pendingTokenHash]` on the table `PendingCompanySignup` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[pendingTokenHash]` on the table `PendingUserSignup` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "PendingCompanySignup" ADD COLUMN     "pendingTokenHash" TEXT;

-- AlterTable
ALTER TABLE "PendingUserSignup" ADD COLUMN     "pendingTokenHash" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "PendingCompanySignup_pendingTokenHash_key" ON "PendingCompanySignup"("pendingTokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "PendingUserSignup_pendingTokenHash_key" ON "PendingUserSignup"("pendingTokenHash");
