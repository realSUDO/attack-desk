-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "hashedPassword" TEXT,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VerificationToken_pkey" PRIMARY KEY ("identifier","token")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- Create a default user for existing data
INSERT INTO "User" ("id", "name", "email", "emailVerified", "createdAt", "updatedAt")
VALUES ('default-user-id', 'Default User', 'default@attackdesk.app', NOW(), NOW(), NOW());

-- Add userId columns as nullable first
ALTER TABLE "Canvas" ADD COLUMN "userId" TEXT;
ALTER TABLE "Deadline" ADD COLUMN "userId" TEXT;
ALTER TABLE "Mission" ADD COLUMN "userId" TEXT;
ALTER TABLE "PostIdea" ADD COLUMN "userId" TEXT;
ALTER TABLE "WeeklyReview" ADD COLUMN "userId" TEXT;

-- Backfill existing rows with the default user
UPDATE "Canvas" SET "userId" = 'default-user-id' WHERE "userId" IS NULL;
UPDATE "Deadline" SET "userId" = 'default-user-id' WHERE "userId" IS NULL;
UPDATE "Mission" SET "userId" = 'default-user-id' WHERE "userId" IS NULL;
UPDATE "PostIdea" SET "userId" = 'default-user-id' WHERE "userId" IS NULL;
UPDATE "WeeklyReview" SET "userId" = 'default-user-id' WHERE "userId" IS NULL;

-- Now make userId required
ALTER TABLE "Canvas" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "Deadline" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "Mission" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "PostIdea" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "WeeklyReview" ALTER COLUMN "userId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Canvas_userId_idx" ON "Canvas"("userId");
CREATE INDEX "Deadline_userId_idx" ON "Deadline"("userId");
CREATE INDEX "Mission_userId_idx" ON "Mission"("userId");
CREATE INDEX "PostIdea_userId_idx" ON "PostIdea"("userId");
CREATE INDEX "WeeklyReview_userId_idx" ON "WeeklyReview"("userId");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Mission" ADD CONSTRAINT "Mission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Deadline" ADD CONSTRAINT "Deadline_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PostIdea" ADD CONSTRAINT "PostIdea_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Canvas" ADD CONSTRAINT "Canvas_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WeeklyReview" ADD CONSTRAINT "WeeklyReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
