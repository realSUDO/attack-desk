CREATE TYPE "MissionStatus" AS ENUM ('PLANNED', 'DOING', 'DONE');
CREATE TYPE "DeadlineStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'MISSED');
CREATE TYPE "PostStatus" AS ENUM ('IDEA', 'DRAFTING', 'READY', 'POSTED');
CREATE TYPE "Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

CREATE TABLE "Mission" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "MissionStatus" NOT NULL DEFAULT 'PLANNED',
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "category" TEXT,
    "dueDate" TIMESTAMP(3),
    "order" INTEGER NOT NULL DEFAULT 0,
    "deadlineId" TEXT,
    "canvasId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Mission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Deadline" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "category" TEXT,
    "status" "DeadlineStatus" NOT NULL DEFAULT 'ACTIVE',
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "link" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Deadline_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PostIdea" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "hook" TEXT,
    "draft" TEXT,
    "finalContent" TEXT,
    "category" TEXT,
    "status" "PostStatus" NOT NULL DEFAULT 'IDEA',
    "postedUrl" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "canvasId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PostIdea_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Canvas" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "data" JSONB,
    "thumbnail" TEXT,
    "deadlineId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Canvas_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WeeklyReview" (
    "id" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "weekEnd" TIMESTAMP(3) NOT NULL,
    "wentRight" TEXT,
    "wentWrong" TEXT,
    "nextPlan" TEXT,
    "finalNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WeeklyReview_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Mission_status_idx" ON "Mission"("status");
CREATE INDEX "Mission_priority_idx" ON "Mission"("priority");
CREATE INDEX "Mission_deadlineId_idx" ON "Mission"("deadlineId");
CREATE INDEX "Mission_canvasId_idx" ON "Mission"("canvasId");
CREATE INDEX "Mission_dueDate_idx" ON "Mission"("dueDate");
CREATE INDEX "Deadline_status_idx" ON "Deadline"("status");
CREATE INDEX "Deadline_priority_idx" ON "Deadline"("priority");
CREATE INDEX "Deadline_category_idx" ON "Deadline"("category");
CREATE INDEX "Deadline_dueDate_idx" ON "Deadline"("dueDate");
CREATE INDEX "PostIdea_status_idx" ON "PostIdea"("status");
CREATE INDEX "PostIdea_category_idx" ON "PostIdea"("category");
CREATE INDEX "PostIdea_canvasId_idx" ON "PostIdea"("canvasId");
CREATE INDEX "Canvas_deadlineId_idx" ON "Canvas"("deadlineId");
CREATE INDEX "WeeklyReview_weekStart_idx" ON "WeeklyReview"("weekStart");
CREATE INDEX "WeeklyReview_weekEnd_idx" ON "WeeklyReview"("weekEnd");

ALTER TABLE "Mission"
ADD CONSTRAINT "Mission_deadlineId_fkey"
FOREIGN KEY ("deadlineId") REFERENCES "Deadline"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Mission"
ADD CONSTRAINT "Mission_canvasId_fkey"
FOREIGN KEY ("canvasId") REFERENCES "Canvas"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PostIdea"
ADD CONSTRAINT "PostIdea_canvasId_fkey"
FOREIGN KEY ("canvasId") REFERENCES "Canvas"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Canvas"
ADD CONSTRAINT "Canvas_deadlineId_fkey"
FOREIGN KEY ("deadlineId") REFERENCES "Deadline"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
