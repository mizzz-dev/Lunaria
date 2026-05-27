import type { JsonObject, PluginMetadata } from "./plugins.js";

export const DAILY_CONTENT_PLUGIN_ID = "daily-content";
export const DAILY_CONTENT_WORKER_ACTOR_ID = "system:daily-content-worker";
export const DAILY_CONTENT_PROCESSING_STALE_AFTER_MS = 15 * 60 * 1000;

export type DailyContentSlot = "quote" | "question" | "mission";
export type DailyContentDeliveryStatus = "processing" | "succeeded" | "retryable_failure";

export interface DailyContentTemplate {
  readonly slot: DailyContentSlot;
  readonly template: string;
}

export interface DailyContentSchedule {
  readonly id: string;
  readonly channelId: string;
  readonly timezone: string;
  readonly postingTime: string;
  readonly content: readonly DailyContentTemplate[];
}

export interface DailyContentConfig extends JsonObject {
  readonly schedules: readonly DailyContentSchedule[];
}

export interface DailyContentDueJob {
  readonly guildId: string;
  readonly scheduleId: string;
  readonly channelId: string;
  readonly targetDate: string;
  readonly contentSlot: DailyContentSlot;
  readonly template: string;
}

export interface DailyContentDeliveryRecord {
  readonly id: string;
  readonly guildId: string;
  readonly scheduleId: string;
  readonly targetDate: string;
  readonly contentSlot: DailyContentSlot;
  readonly channelId: string;
  readonly dedupeKey: string;
  readonly status: DailyContentDeliveryStatus;
  readonly attemptCount: number;
  readonly failureCode?: string;
  readonly publishedAt?: Date;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export type DailyContentDeliveryClaim =
  | { readonly state: "claimed"; readonly delivery: DailyContentDeliveryRecord }
  | { readonly state: "already_succeeded"; readonly delivery: DailyContentDeliveryRecord }
  | { readonly state: "already_processing"; readonly delivery: DailyContentDeliveryRecord };

export interface DailyContentDeliveryStore {
  claim(job: DailyContentDueJob, claimedAt?: Date): Promise<DailyContentDeliveryClaim>;
  succeed(
    guildId: string,
    dedupeKey: string,
    publishedAt: Date
  ): Promise<DailyContentDeliveryRecord>;
  fail(
    guildId: string,
    dedupeKey: string,
    failureCode: string
  ): Promise<DailyContentDeliveryRecord>;
  listByGuild(guildId: string): Promise<DailyContentDeliveryRecord[]>;
}

export const dailyContentPlugin: PluginMetadata = {
  id: DAILY_CONTENT_PLUGIN_ID,
  name: "Daily Content",
  version: "0.1.0",
  description: "設定済みテンプレートを日次で配信するコミュニティ向けプラグイン。",
  configSchema: {
    type: "object",
    required: ["schedules"],
    additionalProperties: false,
    properties: {
      schedules: {
        type: "array",
        maxItems: 20,
        items: {
          type: "object",
          required: ["id", "channelId", "timezone", "postingTime", "content"],
          additionalProperties: false,
          properties: {
            id: {
              type: "string",
              minLength: 1,
              maxLength: 120,
              pattern: "^[A-Za-z0-9_-]+$"
            },
            channelId: {
              type: "string",
              minLength: 1,
              maxLength: 32
            },
            timezone: {
              type: "string",
              format: "iana-time-zone"
            },
            postingTime: {
              type: "string",
              pattern: "^(?:[01][0-9]|2[0-3]):[0-5][0-9]$"
            },
            content: {
              type: "array",
              minItems: 1,
              maxItems: 3,
              items: {
                type: "object",
                required: ["slot", "template"],
                additionalProperties: false,
                properties: {
                  slot: {
                    enum: ["quote", "question", "mission"]
                  },
                  template: {
                    type: "string",
                    minLength: 1,
                    maxLength: 1800
                  }
                }
              }
            }
          }
        }
      }
    }
  },
  permissions: [
    {
      permission: "daily:manage",
      label: "Daily Content管理",
      description: "日次投稿スケジュールとテンプレートを管理できます。"
    }
  ],
  auditEvents: [
    {
      type: "daily_content.config.updated",
      label: "Daily Content設定更新",
      severity: "info"
    },
    {
      type: "daily_content.delivery.succeeded",
      label: "Daily Content配信成功",
      severity: "info"
    },
    {
      type: "daily_content.delivery.failed",
      label: "Daily Content配信失敗",
      severity: "warning"
    }
  ],
  pricing: {
    planKeys: ["free", "pro"],
    usageLimitKey: "daily_content.deliveries"
  },
  dependencies: []
};

export function dailyContentDedupeKey(job: Pick<
  DailyContentDueJob,
  "guildId" | "scheduleId" | "targetDate" | "contentSlot"
>): string {
  return [
    DAILY_CONTENT_PLUGIN_ID,
    job.guildId,
    job.scheduleId,
    job.targetDate,
    job.contentSlot
  ].map(encodeURIComponent).join(":");
}

export function buildDailyContentDueJobs(input: {
  readonly guildId: string;
  readonly targetDate: string;
  readonly schedule: DailyContentSchedule;
}): DailyContentDueJob[] {
  return input.schedule.content.map((entry) => ({
    guildId: input.guildId,
    scheduleId: input.schedule.id,
    channelId: input.schedule.channelId,
    targetDate: input.targetDate,
    contentSlot: entry.slot,
    template: entry.template
  }));
}

export function listDailyContentDueJobs(input: {
  readonly guildId: string;
  readonly config: DailyContentConfig;
  readonly now: Date;
}): DailyContentDueJob[] {
  return input.config.schedules.flatMap((schedule) => {
    const localNow = getDailyContentLocalTime(input.now, schedule.timezone);

    if (localNow.postingTime < schedule.postingTime) {
      return [];
    }

    return buildDailyContentDueJobs({
      guildId: input.guildId,
      targetDate: localNow.targetDate,
      schedule
    });
  });
}

export function isDailyContentConfig(value: unknown): value is DailyContentConfig {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Partial<DailyContentConfig>;
  return (
    hasOnlyKeys(value, ["schedules"]) &&
    Array.isArray(candidate.schedules) &&
    candidate.schedules.length <= 20 &&
    candidate.schedules.every((rawSchedule: unknown) => {
      if (!rawSchedule || typeof rawSchedule !== "object" || Array.isArray(rawSchedule)) {
        return false;
      }

      const schedule = rawSchedule as Partial<DailyContentSchedule>;
      if (
        !hasOnlyKeys(rawSchedule, ["id", "channelId", "timezone", "postingTime", "content"]) ||
        typeof schedule.id !== "string" ||
        schedule.id.length === 0 ||
        schedule.id.length > 120 ||
        !/^[A-Za-z0-9_-]+$/.test(schedule.id) ||
        typeof schedule.channelId !== "string" ||
        schedule.channelId.length === 0 ||
        schedule.channelId.length > 32 ||
        typeof schedule.timezone !== "string" ||
        typeof schedule.postingTime !== "string" ||
        !Array.isArray(schedule.content) ||
        schedule.content.length === 0 ||
        schedule.content.length > 3
      ) {
        return false;
      }

      try {
        new Intl.DateTimeFormat("en-US", { timeZone: schedule.timezone }).format();
      } catch {
        return false;
      }

      return (
        /^(?:[01][0-9]|2[0-3]):[0-5][0-9]$/.test(schedule.postingTime) &&
        schedule.content.every(
          (rawEntry: unknown) => {
            if (!rawEntry || typeof rawEntry !== "object" || Array.isArray(rawEntry)) {
              return false;
            }

            const entry = rawEntry as Partial<DailyContentTemplate>;
            return (
              hasOnlyKeys(rawEntry, ["slot", "template"]) &&
              (entry.slot === "quote" ||
                entry.slot === "question" ||
                entry.slot === "mission") &&
              typeof entry.template === "string" &&
              entry.template.length > 0 &&
              entry.template.length <= 1800
            );
          }
        )
      );
    })
  );
}

function getDailyContentLocalTime(now: Date, timezone: string): {
  readonly targetDate: string;
  readonly postingTime: string;
} {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(now);
  const valueByPart = new Map(parts.map((part) => [part.type, part.value]));
  const year = valueByPart.get("year");
  const month = valueByPart.get("month");
  const day = valueByPart.get("day");
  const hour = valueByPart.get("hour");
  const minute = valueByPart.get("minute");

  if (!year || !month || !day || !hour || !minute) {
    throw new Error("DAILY_CONTENT_LOCAL_TIME_UNAVAILABLE");
  }

  return {
    targetDate: `${year}-${month}-${day}`,
    postingTime: `${hour}:${minute}`
  };
}

function hasOnlyKeys(value: object, allowedKeys: readonly string[]): boolean {
  return Object.keys(value).every((key) => allowedKeys.includes(key));
}
