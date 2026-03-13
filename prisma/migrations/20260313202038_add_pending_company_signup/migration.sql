-- CreateTable
CREATE TABLE "PendingCompanySignup" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "bin" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastSentAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PendingCompanySignup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PendingCompanySignup_bin_key" ON "PendingCompanySignup"("bin");

-- CreateIndex
CREATE UNIQUE INDEX "PendingCompanySignup_phone_key" ON "PendingCompanySignup"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "PendingCompanySignup_email_key" ON "PendingCompanySignup"("email");

-- CreateIndex
CREATE INDEX "PendingCompanySignup_expiresAt_idx" ON "PendingCompanySignup"("expiresAt");
