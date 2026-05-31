import {
  DAILY_CONTENT_PLUGIN_ID,
  isDailyContentConfig,
  listDailyContentDueJobs,
  type GuildPluginSettings
} from "@lunaria/core";
import type { EnqueueDailyContentDueGuildInput } from "./daily-content-queue.js";

export interface DailyContentSchedulerSettingsStore {
  listEnabledByPlugin(pluginId: string): Promise<readonly GuildPluginSettings[]>;
}

export interface DailyContentDueGuildProducer {
  enqueueDueGuild(input: EnqueueDailyContentDueGuildInput): Promise<unknown>;
}

export interface DailyContentSchedulerLogger {
  info(message: string, metadata?: Record<string, unknown>): void;
  warn(message: string, metadata?: Record<string, unknown>): void;
  error(message: string, metadata?: Record<string, unknown>): void;
}

export interface DailyContentSchedulerRunInput {
  readonly referenceTime?: Date;
  readonly enqueuedAt?: Date;
}

export interface DailyContentSchedulerRunResult {
  readonly scannedSettingCount: number;
  readonly dueGuildCount: number;
  readonly skippedDisabledCount: number;
  readonly skippedInvalidConfigCount: number;
  readonly skippedNotDueCount: number;
  readonly duplicateGuildCount: number;
  readonly referenceTime: string;
  readonly enqueuedAt: string;
}

export class DailyContentScheduler {
  constructor(
    private readonly settings: DailyContentSchedulerSettingsStore,
    private readonly producer: DailyContentDueGuildProducer,
    private readonly now = () => new Date(),
    private readonly logger?: DailyContentSchedulerLogger
  ) {}

  async enqueueDueGuildScans(
    input: DailyContentSchedulerRunInput = {}
  ): Promise<DailyContentSchedulerRunResult> {
    const currentTime = this.now();
    const referenceTime = truncateToMinute(input.referenceTime ?? currentTime);
    const enqueuedAt = input.enqueuedAt ?? currentTime;
    let settings: readonly GuildPluginSettings[];

    try {
      settings = await this.settings.listEnabledByPlugin(DAILY_CONTENT_PLUGIN_ID);
    } catch {
      this.logger?.error("Daily Content scheduler settings scan failed");
      throw new Error("DAILY_CONTENT_SCHEDULER_SETTINGS_SCAN_FAILED");
    }

    let dueGuildCount = 0;
    let skippedDisabledCount = 0;
    let skippedInvalidConfigCount = 0;
    let skippedNotDueCount = 0;
    let duplicateGuildCount = 0;
    const seenGuildIds = new Set<string>();

    for (const setting of settings) {
      if (setting.pluginId !== DAILY_CONTENT_PLUGIN_ID || !setting.enabled) {
        skippedDisabledCount += 1;
        continue;
      }

      if (seenGuildIds.has(setting.guildId)) {
        duplicateGuildCount += 1;
        continue;
      }

      seenGuildIds.add(setting.guildId);

      if (!isDailyContentConfig(setting.config)) {
        skippedInvalidConfigCount += 1;
        this.logger?.warn("Daily Content scheduler skipped invalid config", {
          guildId: setting.guildId
        });
        continue;
      }

      const dueJobs = listDailyContentDueJobs({
        guildId: setting.guildId,
        config: setting.config,
        now: referenceTime
      });

      if (dueJobs.length === 0) {
        skippedNotDueCount += 1;
        continue;
      }

      try {
        await this.producer.enqueueDueGuild({
          guildId: setting.guildId,
          referenceTime,
          enqueuedAt
        });
      } catch {
        this.logger?.error("Daily Content scheduler enqueue failed", {
          guildId: setting.guildId
        });
        throw new Error("DAILY_CONTENT_SCHEDULER_ENQUEUE_FAILED");
      }

      dueGuildCount += 1;
    }

    const result = {
      scannedSettingCount: settings.length,
      dueGuildCount,
      skippedDisabledCount,
      skippedInvalidConfigCount,
      skippedNotDueCount,
      duplicateGuildCount,
      referenceTime: referenceTime.toISOString(),
      enqueuedAt: enqueuedAt.toISOString()
    };

    this.logger?.info("Daily Content scheduler scan completed", result);
    return result;
  }
}

function truncateToMinute(value: Date): Date {
  const next = new Date(value);
  next.setUTCSeconds(0, 0);
  return next;
}

export interface DailyContentSchedulerRegistration {
  runNow(): Promise<DailyContentSchedulerRunResult>;
  close(): Promise<void>;
}

export function registerDailyContentScheduler(input: {
  readonly scheduler: Pick<DailyContentScheduler, "enqueueDueGuildScans">;
  readonly intervalMs: number;
  readonly runImmediately?: boolean;
  readonly logger?: DailyContentSchedulerLogger;
}): DailyContentSchedulerRegistration {
  let closing = false;
  let running: Promise<DailyContentSchedulerRunResult> | undefined;

  const runNow = async (): Promise<DailyContentSchedulerRunResult> => {
    if (closing) {
      throw new Error("DAILY_CONTENT_SCHEDULER_CLOSED");
    }

    if (running) {
      return running;
    }

    running = input.scheduler.enqueueDueGuildScans().finally(() => {
      running = undefined;
    });
    return running;
  };

  const interval = setInterval(() => {
    runNow().catch(() => {
      input.logger?.warn("Daily Content scheduler tick failed");
    });
  }, input.intervalMs);

  if (input.runImmediately ?? true) {
    runNow().catch(() => {
      input.logger?.warn("Daily Content scheduler initial scan failed");
    });
  }

  return {
    runNow,
    async close() {
      closing = true;
      clearInterval(interval);

      if (running) {
        await running.catch(() => undefined);
      }
    }
  };
}
