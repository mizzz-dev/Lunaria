import { describe, expect, it } from "vitest";
import {
  DAILY_CONTENT_PLUGIN_ID,
  buildDailyContentDueJobs,
  dailyContentDedupeKey,
  dailyContentPlugin,
  isDailyContentConfig,
  listDailyContentDueJobs
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
    expect(isDailyContentConfig({ schedules: [{ ...schedule, unexpected: true }] })).toBe(false);
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

  it("lists jobs only after the posting time in the schedule timezone", () => {
    const config = { schedules: [schedule] };
    const beforeDue = listDailyContentDueJobs({
      guildId: "guild-placeholder-a",
      config,
      now: new Date("2026-05-27T23:29:00.000Z")
    });
    const afterDue = listDailyContentDueJobs({
      guildId: "guild-placeholder-a",
      config,
      now: new Date("2026-05-27T23:45:00.000Z")
    });
    const sameDayRescan = listDailyContentDueJobs({
      guildId: "guild-placeholder-a",
      config,
      now: new Date("2026-05-28T01:00:00.000Z")
    });

    expect(beforeDue).toEqual([]);
    expect(afterDue.map((job) => job.targetDate)).toEqual(["2026-05-28", "2026-05-28"]);
    expect(sameDayRescan.map(dailyContentDedupeKey)).toEqual(afterDue.map(dailyContentDedupeKey));
  });

  it("selects a new target date at the Asia/Tokyo date boundary", () => {
    const midnightSchedule = { ...schedule, postingTime: "00:00" };
    const previousDate = listDailyContentDueJobs({
      guildId: "guild-placeholder-a",
      config: { schedules: [midnightSchedule] },
      now: new Date("2026-05-27T14:59:00.000Z")
    });
    const nextDate = listDailyContentDueJobs({
      guildId: "guild-placeholder-a",
      config: { schedules: [midnightSchedule] },
      now: new Date("2026-05-27T15:00:00.000Z")
    });

    expect(previousDate[0]?.targetDate).toBe("2026-05-27");
    expect(nextDate[0]?.targetDate).toBe("2026-05-28");
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
