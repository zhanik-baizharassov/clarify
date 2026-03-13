-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Tag" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "Category_isActive_parentId_sortOrder_idx" ON "Category"("isActive", "parentId", "sortOrder");

-- CreateIndex
CREATE INDEX "Tag_isActive_sortOrder_idx" ON "Tag"("isActive", "sortOrder");
