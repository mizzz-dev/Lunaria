-- CreateTable
CREATE TABLE "Quote" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sourceMessageId" TEXT NOT NULL,
    "sourceMessageUrl" TEXT NOT NULL,
    "sourceAuthorId" TEXT NOT NULL,
    "sourceAuthorName" TEXT NOT NULL,
    "sourceChannelId" TEXT NOT NULL,
    "sourceChannelName" TEXT NOT NULL,
    "sourceCreatedAt" TIMESTAMP(3) NOT NULL,
    "registeredByUserId" TEXT NOT NULL,
    "hiddenAt" TIMESTAMP(3),
    "hiddenByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Quote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Quote_guildId_sourceMessageId_key" ON "Quote"("guildId", "sourceMessageId");

-- CreateIndex
CREATE INDEX "Quote_guildId_hiddenAt_createdAt_idx" ON "Quote"("guildId", "hiddenAt", "createdAt");

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;
