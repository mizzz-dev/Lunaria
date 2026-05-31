import { DAILY_CONTENT_PLUGIN_ID, type GuildPluginSettings } from "@lunaria/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DailyContentScheduler,
  registerDailyContentScheduler,
  type DailyContentDueGuildProducer,
  type DailyContentSchedulerLogger,
  type DailyContentSchedulerSettingsStore
} from "./daily-content-scheduler.js";

const validConfig = {
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

function setting(
  input: Partial<GuildPluginSettings> & Pick<GuildPluginSettings, "guildId">
): GuildPluginSettings {
  return {
    guildId: input.guildId,
    pluginId: input.pluginId ?? DAILY_CONTENT_PLUGIN_ID,
    enabled: input.enabled ?? true,
    config: input.config ?? validConfig,
    updatedByUserId: input.updatedByUserId ?? "user-placeholder-admin",
    updatedAt: input.updatedAt ?? new Date("2026-05-27T00:00:00.000Z")
  };
}

class FakeSettingsStore implements DailyContentSchedulerSettingsStore {
  constructor(private readonly settings: readonly GuildPluginSettings[]) {}

  readonly listEnabledByPlugin = vi.fn(async () => this.settings);
}

class FakeProducer implements DailyContentDueGuildProducer {
  readonly enqueueDueGuild = vi.fn<DailyContentDueGuildProducer["enqueueDueGuild"]>();

  constructor(result: "ok" | "fail" = "ok") {
    if (result === "ok") {
      this.enqueueDueGuild.mockResolvedValue({ id: "job-placeholder" });
    } else {
      this.enqueueDueGuild.mockRejectedValue(new Error("secret {{question}} transport failure"));
    }
  }
}

function createLogger(): DailyContentSchedulerLogger {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  };
}

function stringifyLoggerCalls(logger: DailyContentSchedulerLogger): string {
  return JSON.stringify([
    vi.mocked(logger.info).mock.calls,
    vi.mocked(logger.warn).mock.calls,
    vi.mocked(logger.error).mock.calls
  ]);
}

describe("DailyContentScheduler", () => {
  it("enqueues due guild scans only for enabled valid Daily Content settings", async () => {
    const settings = new FakeSettingsStore([
      setting({ guildId: "guild-placeholder-a" }),
      setting({ guildId: "guild-placeholder-b", enabled: false }),
      setting({
        guildId: "guild-placeholder-c",
        config: { schedules: [{ ...validConfig.schedules[0], postingTime: "invalid" }] }
      }),
      setting({
        guildId: "guild-placeholder-d",
        config: {
          schedules: [{ ...validConfig.schedules[0], postingTime: "08:31" }]
        }
      }),
      setting({ guildId: "guild-placeholder-e", pluginId: "quote" }),
      setting({ guildId: "guild-placeholder-a" })
    ]);
    const producer = new FakeProducer();
    const logger = createLogger();
    const scheduler = new DailyContentScheduler(
      settings,
      producer,
      () => new Date("2026-05-27T23:30:00.000Z"),
      logger
    );

    const result = await scheduler.enqueueDueGuildScans({
      enqueuedAt: new Date("2026-05-27T23:30:10.000Z")
    });

    expect(settings.listEnabledByPlugin).toHaveBeenCalledWith(DAILY_CONTENT_PLUGIN_ID);
    expect(producer.enqueueDueGuild).toHaveBeenCalledOnce();
    expect(producer.enqueueDueGuild).toHaveBeenCalledWith({
      guildId: "guild-placeholder-a",
      referenceTime: new Date("2026-05-27T23:30:00.000Z"),
      enqueuedAt: new Date("2026-05-27T23:30:10.000Z")
    });
    expect(result).toEqual({
      scannedSettingCount: 6,
      dueGuildCount: 1,
      skippedDisabledCount: 2,
      skippedInvalidConfigCount: 1,
      skippedNotDueCount: 1,
      duplicateGuildCount: 1,
      referenceTime: "2026-05-27T23:30:00.000Z",
      enqueuedAt: "2026-05-27T23:30:10.000Z"
    });
    expect(JSON.stringify(producer.enqueueDueGuild.mock.calls)).not.toContain("{{question}}");
    expect(JSON.stringify(result)).not.toContain("{{question}}");
    expect(stringifyLoggerCalls(logger)).not.toContain("{{question}}");
  });

  it("normalizes scheduler reference time to a deterministic minute bucket", async () => {
    const producer = new FakeProducer();
    const scheduler = new DailyContentScheduler(
      new FakeSettingsStore([setting({ guildId: "guild-placeholder-a" })]),
      producer,
      () => new Date("2026-05-27T23:30:45.678Z")
    );

    const result = await scheduler.enqueueDueGuildScans();

    expect(producer.enqueueDueGuild).toHaveBeenCalledWith({
      guildId: "guild-placeholder-a",
      referenceTime: new Date("2026-05-27T23:30:00.000Z"),
      enqueuedAt: new Date("2026-05-27T23:30:45.678Z")
    });
    expect(result.referenceTime).toBe("2026-05-27T23:30:00.000Z");
    expect(result.enqueuedAt).toBe("2026-05-27T23:30:45.678Z");
  });

  it("sanitizes enqueue failures before logging or rethrowing", async () => {
    const logger = createLogger();
    const scheduler = new DailyContentScheduler(
      new FakeSettingsStore([setting({ guildId: "guild-placeholder-a" })]),
      new FakeProducer("fail"),
      () => new Date("2026-05-27T23:30:00.000Z"),
      logger
    );

    await expect(scheduler.enqueueDueGuildScans()).rejects.toThrow(
      "DAILY_CONTENT_SCHEDULER_ENQUEUE_FAILED"
    );
    expect(stringifyLoggerCalls(logger)).not.toContain("{{question}}");
    expect(stringifyLoggerCalls(logger)).not.toContain("secret");
  });
});

describe("registerDailyContentScheduler", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("runs on an interval and stops ticking after close", async () => {
    vi.useFakeTimers();
    const scheduler = {
      enqueueDueGuildScans: vi.fn().mockResolvedValue({
        scannedSettingCount: 0,
        dueGuildCount: 0,
        skippedDisabledCount: 0,
        skippedInvalidConfigCount: 0,
        skippedNotDueCount: 0,
        duplicateGuildCount: 0,
        referenceTime: "2026-05-27T23:30:00.000Z",
        enqueuedAt: "2026-05-27T23:30:00.000Z"
      })
    };
    const registration = registerDailyContentScheduler({
      scheduler,
      intervalMs: 1_000,
      runImmediately: false
    });

    await vi.advanceTimersByTimeAsync(1_000);
    expect(scheduler.enqueueDueGuildScans).toHaveBeenCalledOnce();

    await registration.close();
    await vi.advanceTimersByTimeAsync(2_000);

    expect(scheduler.enqueueDueGuildScans).toHaveBeenCalledOnce();
  });
});
