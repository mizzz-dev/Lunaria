-- CreateTable
CREATE TABLE "DailyContentDelivery" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "targetDate" TEXT NOT NULL,
    "contentSlot" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "attemptCount" INTEGER NOT NULL DEFAULT 1,
    "failureCode" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyContentDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DailyContentDelivery_dedupeKey_key" ON "DailyContentDelivery"("dedupeKey");

-- CreateIndex
CREATE INDEX "DailyContentDelivery_guildId_targetDate_idx" ON "DailyContentDelivery"("guildId", "targetDate");

-- CreateIndex
CREATE INDEX "DailyContentDelivery_guildId_status_createdAt_idx" ON "DailyContentDelivery"("guildId", "status", "createdAt");

-- AddForeignKey
ALTER TABLE "DailyContentDelivery" ADD CONSTRAINT "DailyContentDelivery_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;
