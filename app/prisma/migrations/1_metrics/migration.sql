-- AlterTable
ALTER TABLE "ContentSlot" ADD COLUMN     "publishedAt" TIMESTAMP(3),
ADD COLUMN     "xTweetId" TEXT;

-- CreateTable
CREATE TABLE "SlotMetricSnapshot" (
    "id" TEXT NOT NULL,
    "contentSlotId" TEXT NOT NULL,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "replies" INTEGER NOT NULL DEFAULT 0,
    "reposts" INTEGER NOT NULL DEFAULT 0,
    "bookmarks" INTEGER NOT NULL DEFAULT 0,
    "linkClicks" INTEGER NOT NULL DEFAULT 0,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SlotMetricSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SlotMetricSnapshot_contentSlotId_capturedAt_idx" ON "SlotMetricSnapshot"("contentSlotId", "capturedAt");

-- AddForeignKey
ALTER TABLE "SlotMetricSnapshot" ADD CONSTRAINT "SlotMetricSnapshot_contentSlotId_fkey" FOREIGN KEY ("contentSlotId") REFERENCES "ContentSlot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

