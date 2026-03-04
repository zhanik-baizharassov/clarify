/*
  Warnings:

  - A unique constraint covering the columns `[ownerId]` on the table `Company` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[reviewId,companyId]` on the table `ReviewReply` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Company_ownerId_key" ON "Company"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewReply_reviewId_companyId_key" ON "ReviewReply"("reviewId", "companyId");
