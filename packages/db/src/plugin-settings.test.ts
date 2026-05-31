import type { PrismaClient } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import { PrismaGuildPluginSettingsStore } from "./plugin-settings.js";

const updatedAt = new Date("2026-05-27T00:00:00.000Z");
const record = {
  guildId: "guild-placeholder-a",
  pluginId: "daily-content",
  enabled: true,
  config: { schedules: [] },
  updatedByUserId: "user-placeholder-admin",
  updatedAt
};

const client = {
  pluginSetting: {
    findMany: vi.fn()
  }
};

describe("PrismaGuildPluginSettingsStore", () => {
  it("lists enabled settings for a plugin in deterministic guild order", async () => {
    client.pluginSetting.findMany.mockResolvedValue([record]);
    const store = new PrismaGuildPluginSettingsStore(client as unknown as PrismaClient);

    const settings = await store.listEnabledByPlugin("daily-content");

    expect(client.pluginSetting.findMany).toHaveBeenCalledWith({
      where: {
        pluginId: "daily-content",
        enabled: true
      },
      orderBy: [{ guildId: "asc" }, { updatedAt: "asc" }]
    });
    expect(settings).toEqual([
      {
        guildId: "guild-placeholder-a",
        pluginId: "daily-content",
        enabled: true,
        config: { schedules: [] },
        updatedByUserId: "user-placeholder-admin",
        updatedAt
      }
    ]);
  });
});
