-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "personaId" TEXT,
    "publishMethod" TEXT NOT NULL DEFAULT 'manual',
    "color" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'disconnected',
    "apiKey" TEXT,
    "apiSecret" TEXT,
    "accessToken" TEXT,
    "accessTokenSecret" TEXT,
    "typefullyApiKey" TEXT,
    "capxMix" INTEGER NOT NULL DEFAULT 55,
    "nicheMix" INTEGER NOT NULL DEFAULT 30,
    "personalMix" INTEGER NOT NULL DEFAULT 15,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklyPlan" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "personaId" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'planned',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeeklyPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentSlot" (
    "id" TEXT NOT NULL,
    "weeklyPlanId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "pillar" TEXT NOT NULL,
    "scheduledTime" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "selectedVariantId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TweetVariant" (
    "id" TEXT NOT NULL,
    "contentSlotId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "generatedBy" TEXT NOT NULL,
    "traitsUsed" TEXT[],
    "factsUsed" TEXT[],
    "seedTweetsUsed" TEXT[],
    "nicheContext" TEXT,
    "promptVersion" TEXT NOT NULL DEFAULT '1.0',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TweetVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tweet" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "personaId" TEXT NOT NULL,
    "pillar" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "scheduledAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "xTweetId" TEXT,
    "traitsUsed" TEXT[],
    "factsUsed" TEXT[],
    "seedTweetsUsed" TEXT[],
    "nicheContext" TEXT,
    "promptVersion" TEXT NOT NULL DEFAULT '1.0',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tweet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReplyDraft" (
    "id" TEXT NOT NULL,
    "sourceTweetUrl" TEXT NOT NULL,
    "sourceTweetText" TEXT NOT NULL,
    "personaId" TEXT NOT NULL,
    "variants" TEXT[],
    "selectedVariant" TEXT,
    "status" TEXT NOT NULL DEFAULT 'drafted',
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReplyDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetricSnapshot" (
    "id" TEXT NOT NULL,
    "tweetId" TEXT NOT NULL,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "replies" INTEGER NOT NULL DEFAULT 0,
    "reposts" INTEGER NOT NULL DEFAULT 0,
    "bookmarks" INTEGER NOT NULL DEFAULT 0,
    "linkClicks" INTEGER NOT NULL DEFAULT 0,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MetricSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "accountHandle" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'error',
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppSettings" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "defaultModel" TEXT NOT NULL DEFAULT 'gemini-flash',
    "capxMixDefault" INTEGER NOT NULL DEFAULT 55,
    "nicheMixDefault" INTEGER NOT NULL DEFAULT 30,
    "personalMixDefault" INTEGER NOT NULL DEFAULT 15,
    "postsPerWeekDefault" INTEGER NOT NULL DEFAULT 7,
    "postingTimesDefault" TEXT[],
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Account_handle_key" ON "Account"("handle");

-- AddForeignKey
ALTER TABLE "WeeklyPlan" ADD CONSTRAINT "WeeklyPlan_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentSlot" ADD CONSTRAINT "ContentSlot_weeklyPlanId_fkey" FOREIGN KEY ("weeklyPlanId") REFERENCES "WeeklyPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TweetVariant" ADD CONSTRAINT "TweetVariant_contentSlotId_fkey" FOREIGN KEY ("contentSlotId") REFERENCES "ContentSlot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tweet" ADD CONSTRAINT "Tweet_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetricSnapshot" ADD CONSTRAINT "MetricSnapshot_tweetId_fkey" FOREIGN KEY ("tweetId") REFERENCES "Tweet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

