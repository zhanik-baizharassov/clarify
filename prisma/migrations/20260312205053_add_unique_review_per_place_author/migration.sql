/*
  Warnings:

  - A unique constraint covering the columns `[placeId,authorId]` on the table `Review` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Review_placeId_authorId_key" ON "Review"("placeId", "authorId");
