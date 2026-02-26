/*
  Warnings:

  - You are about to drop the column `authorName` on the `Review` table. All the data in the column will be lost.
  - You are about to drop the column `authorPhone` on the `Review` table. All the data in the column will be lost.
  - Made the column `authorId` on table `Review` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Review" DROP CONSTRAINT "Review_authorId_fkey";

-- AlterTable
ALTER TABLE "Review" DROP COLUMN "authorName",
DROP COLUMN "authorPhone",
ALTER COLUMN "authorId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Review_authorId_idx" ON "Review"("authorId");

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
