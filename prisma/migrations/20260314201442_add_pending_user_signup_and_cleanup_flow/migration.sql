-- CreateTable
CREATE TABLE "PendingUserSignup" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastSentAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PendingUserSignup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PendingUserSignup_nickname_key" ON "PendingUserSignup"("nickname");

-- CreateIndex
CREATE UNIQUE INDEX "PendingUserSignup_phone_key" ON "PendingUserSignup"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "PendingUserSignup_email_key" ON "PendingUserSignup"("email");

-- CreateIndex
CREATE INDEX "PendingUserSignup_expiresAt_idx" ON "PendingUserSignup"("expiresAt");
