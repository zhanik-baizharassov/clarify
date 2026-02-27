-- AlterTable
ALTER TABLE "User" ADD COLUMN     "avatarUrl" TEXT,
ADD COLUMN     "profileEditCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "profileEditedAt" TIMESTAMP(3);
