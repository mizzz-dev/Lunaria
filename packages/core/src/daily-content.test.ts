import { describe, expect, it } from "vitest";
import {
  DAILY_CONTENT_PLUGIN_ID,
  buildDailyContentDueJobs,
  dailyContentDedupeKey,
  dailyContentPlugin,
  isDailyContentConfig
} from "./daily-content.js";
import { PluginRegistry } from "./plugins.js";

const schedule = {
  id: "daily-morning",
  channelId: "channel-placeholder-1",
  timezone: "Asia/Tokyo",
  postingTime: "08:30",
  content: [
    { slot: "question" as const, template: "今日の質問: {{question}}" },
    { slot: "mission" as const, template: "今日のミッション: {{mission}}" }
  ]
};

describe("Daily Content plugin", () => {
  it("validates guild schedule settings including an IANA timezone", () => {
    const registry = new PluginRegistry();
    registry.register(dailyContentPlugin);

    expect(
      registry.validateConfig(DAILY_CONTENT_PLUGIN_ID, { schedules: [schedule] }).valid
    ).toBe(true);
    expect(isDailyContentConfig({ schedules: [schedule] })).toBe(true);
    expect(
      registry.validateConfig(DAILY_CONTENT_PLUGIN_ID, {
        schedules: [{ ...schedule, timezone: "Tokyo/invalid", postingTime: "28:00" }]
      }).valid
    ).toBe(false);
    expect(isDailyContentConfig({ schedules: [{ ...schedule, timezone: "Tokyo/invalid" }] })).toBe(
      false
    );
  });

  it("builds one due job per configured content slot", () => {
    const jobs = buildDailyContentDueJobs({
      guildId: "guild-placeholder-a",
      targetDate: "2026-05-28",
      schedule
    });

    expect(jobs.map((job) => job.contentSlot)).toEqual(["question", "mission"]);
    expect(jobs[0]?.channelId).toBe("channel-placeholder-1");
  });

  it("uses guild, schedule, target date and content slot in its dedupe key", () => {
    const base = {
      guildId: "guild-placeholder-a",
      scheduleId: "daily-morning",
      targetDate: "2026-05-28",
      contentSlot: "question" as const
    };

    expect(dailyContentDedupeKey(base)).toBe(
      "daily-content:guild-placeholder-a:daily-morning:2026-05-28:question"
    );
    expect(dailyContentDedupeKey({ ...base, guildId: "guild-placeholder-b" })).not.toBe(
      dailyContentDedupeKey(base)
    );
    expect(dailyContentDedupeKey({ ...base, contentSlot: "mission" })).not.toBe(
      dailyContentDedupeKey(base)
    );
  });
});
