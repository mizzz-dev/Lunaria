import {
  DAILY_CONTENT_PLUGIN_ID,
  InMemoryGuildPluginSettingsStore,
  dailyContentDedupeKey,
  type DailyContentDeliveryRecord,
  type DailyContentDueJob
} from "@lunaria/core";
import { describe, expect, it, vi } from "vitest";
import { DailyContentOrchestrator } from "./daily-content-orchestrator.js";
import type { DailyContentProcessingResult } from "./daily-content-processor.js";

const config = {
  schedules: [
    {
      id: "daily-morning",
      channelId: "channel-placeholder-1",
      timezone: "Asia/Tokyo",
      postingTime: "08:30",
      content: [{ slot: "question" as const, template: "今日の質問: {{question}}" }]
    }
  ]
};

async function enableSettings(store: InMemoryGuildPluginSettingsStore, guildId: string): Promise<void> {
  await store.set({
    guildId,
    pluginId: DAILY_CONTENT_PLUGIN_ID,
    enabled: true,
    config,
    updatedByUserId: "user-placeholder-admin",
    updatedAt: new Date("2026-05-27T00:00:00.000Z")
  });
}

describe("DailyContentOrchestrator", () => {
  it("loads an enabled guild setting and passes its due jobs to the processor", async () => {
    const settings = new InMemoryGuildPluginSettingsStore();
    await enableSettings(settings, "guild-placeholder-a");
    const processor = {
      process: vi
        .fn<(job: DailyContentDueJob) => Promise<DailyContentProcessingResult>>()
        .mockResolvedValue({
          state: "published",
          delivery: {} as DailyContentDeliveryRecord
        })
    };
    const orchestrator = new DailyContentOrchestrator(
      settings,
      processor,
      () => new Date("2026-05-27T23:30:00.000Z")
    );

    const processed = await orchestrator.processDueForGuild("guild-placeholder-a");

    expect(processed.jobs).toHaveLength(1);
    expect(dailyContentDedupeKey(processed.jobs[0]!)).toBe(
      "daily-content:guild-placeholder-a:daily-morning:2026-05-28:question"
    );
    expect(processor.process).toHaveBeenCalledWith(processed.jobs[0]);
  });

  it("does not pass another guild's or not-yet-due settings to processing", async () => {
    const settings = new InMemoryGuildPluginSettingsStore();
    await enableSettings(settings, "guild-placeholder-a");
    await enableSettings(settings, "guild-placeholder-b");
    const processor = {
      process: vi.fn<(job: DailyContentDueJob) => Promise<DailyContentProcessingResult>>()
    };
    const orchestrator = new DailyContentOrchestrator(
      settings,
      processor,
      () => new Date("2026-05-27T23:29:00.000Z")
    );

    expect((await orchestrator.processDueForGuild("guild-placeholder-a")).jobs).toEqual([]);
    expect(processor.process).not.toHaveBeenCalled();
  });

  it("enumerates jobs only from the requested guild setting", async () => {
    const settings = new InMemoryGuildPluginSettingsStore();
    await enableSettings(settings, "guild-placeholder-a");
    await settings.set({
      guildId: "guild-placeholder-b",
      pluginId: DAILY_CONTENT_PLUGIN_ID,
      enabled: true,
      config: {
        schedules: [{ ...config.schedules[0], channelId: "channel-placeholder-2" }]
      },
      updatedByUserId: "user-placeholder-admin",
      updatedAt: new Date("2026-05-27T00:00:00.000Z")
    });
    const processor = {
      process: vi
        .fn<(job: DailyContentDueJob) => Promise<DailyContentProcessingResult>>()
        .mockResolvedValue({
          state: "published",
          delivery: {} as DailyContentDeliveryRecord
        })
    };
    const orchestrator = new DailyContentOrchestrator(
      settings,
      processor,
      () => new Date("2026-05-27T23:30:00.000Z")
    );

    const processed = await orchestrator.processDueForGuild("guild-placeholder-a");

    expect(processed.jobs).toHaveLength(1);
    expect(processed.jobs[0]?.guildId).toBe("guild-placeholder-a");
    expect(processed.jobs[0]?.channelId).toBe("channel-placeholder-1");
  });

  it("rejects enabled settings that do not contain a validated Daily Content config", async () => {
    const settings = new InMemoryGuildPluginSettingsStore();
    await settings.set({
      guildId: "guild-placeholder-a",
      pluginId: DAILY_CONTENT_PLUGIN_ID,
      enabled: true,
      config: { schedules: [{ ...config.schedules[0], postingTime: "invalid" }] },
      updatedByUserId: "user-placeholder-admin",
      updatedAt: new Date("2026-05-27T00:00:00.000Z")
    });
    const orchestrator = new DailyContentOrchestrator(
      settings,
      { process: vi.fn() },
      () => new Date("2026-05-27T23:30:00.000Z")
    );

    await expect(orchestrator.processDueForGuild("guild-placeholder-a")).rejects.toThrow(
      "DAILY_CONTENT_CONFIG_INVALID"
    );
  });
});
