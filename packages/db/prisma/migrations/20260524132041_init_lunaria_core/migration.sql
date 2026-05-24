-- CreateTable
CREATE TABLE "Guild" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Guild_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PluginSetting" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "pluginId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "config" JSONB NOT NULL,
    "updatedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PluginSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rule" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "pluginId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "trigger" TEXT NOT NULL,
    "conditions" JSONB NOT NULL,
    "actions" JSONB NOT NULL,
    "cooldown" JSONB,
    "preventBotLoop" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Rule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "pluginId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "targetId" TEXT,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RbacAssignment" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RbacAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PluginSetting_guildId_idx" ON "PluginSetting"("guildId");

-- CreateIndex
CREATE UNIQUE INDEX "PluginSetting_guildId_pluginId_key" ON "PluginSetting"("guildId", "pluginId");

-- CreateIndex
CREATE INDEX "Rule_guildId_enabled_trigger_idx" ON "Rule"("guildId", "enabled", "trigger");

-- CreateIndex
CREATE INDEX "Rule_pluginId_idx" ON "Rule"("pluginId");

-- CreateIndex
CREATE INDEX "AuditLog_guildId_createdAt_idx" ON "AuditLog"("guildId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_pluginId_type_idx" ON "AuditLog"("pluginId", "type");

-- CreateIndex
CREATE INDEX "RbacAssignment_guildId_userId_idx" ON "RbacAssignment"("guildId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "RbacAssignment_guildId_userId_roleKey_key" ON "RbacAssignment"("guildId", "userId", "roleKey");

-- AddForeignKey
ALTER TABLE "PluginSetting" ADD CONSTRAINT "PluginSetting_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rule" ADD CONSTRAINT "Rule_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RbacAssignment" ADD CONSTRAINT "RbacAssignment_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;
