import type { GuildPluginSettings, GuildPluginSettingsStore } from "@lunaria/core";
import type { PrismaClient } from "@prisma/client";
import { ensureGuild } from "./guilds.js";
import { toInputJson, toJsonObject } from "./json.js";

export class PrismaGuildPluginSettingsStore implements GuildPluginSettingsStore {
  constructor(private readonly prisma: PrismaClient) {}

  async get(guildId: string, pluginId: string): Promise<GuildPluginSettings | undefined> {
    const record = await this.prisma.pluginSetting.findUnique({
      where: {
        guildId_pluginId: {
          guildId,
          pluginId
        }
      }
    });

    return record ? this.toDomain(record) : undefined;
  }

  async set(settings: GuildPluginSettings): Promise<GuildPluginSettings> {
    await ensureGuild(this.prisma, { id: settings.guildId });

    const record = await this.prisma.pluginSetting.upsert({
      where: {
        guildId_pluginId: {
          guildId: settings.guildId,
          pluginId: settings.pluginId
        }
      },
      create: {
        guildId: settings.guildId,
        pluginId: settings.pluginId,
        enabled: settings.enabled,
        config: toInputJson(settings.config),
        updatedByUserId: settings.updatedByUserId
      },
      update: {
        enabled: settings.enabled,
        config: toInputJson(settings.config),
        updatedByUserId: settings.updatedByUserId
      }
    });

    return this.toDomain(record);
  }

  async listByGuild(guildId: string): Promise<GuildPluginSettings[]> {
    const records = await this.prisma.pluginSetting.findMany({
      where: { guildId },
      orderBy: { pluginId: "asc" }
    });

    return records.map((record) => this.toDomain(record));
  }

  async listEnabledByPlugin(pluginId: string): Promise<GuildPluginSettings[]> {
    const records = await this.prisma.pluginSetting.findMany({
      where: {
        pluginId,
        enabled: true
      },
      orderBy: [{ guildId: "asc" }, { updatedAt: "asc" }]
    });

    return records.map((record) => this.toDomain(record));
  }

  private toDomain(record: {
    guildId: string;
    pluginId: string;
    enabled: boolean;
    config: unknown;
    updatedByUserId: string;
    updatedAt: Date;
  }): GuildPluginSettings {
    return {
      guildId: record.guildId,
      pluginId: record.pluginId,
      enabled: record.enabled,
      config: toJsonObject(record.config),
      updatedByUserId: record.updatedByUserId,
      updatedAt: record.updatedAt
    };
  }
}
