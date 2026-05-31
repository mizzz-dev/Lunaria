import {
  DAILY_CONTENT_PLUGIN_ID,
  isDailyContentConfig,
  type AuditLogRecord,
  type GuildPluginSettings
} from "@lunaria/core";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./route";

const state = vi.hoisted(() => ({
  settings: undefined as GuildPluginSettings | undefined,
  logs: [] as AuditLogRecord[],
  logSequence: 0
}));

const auth = vi.hoisted(() => ({
  requireManageableGuild: vi.fn()
}));

vi.mock("@lunaria/db", () => ({
  prisma: {},
  PrismaGuildPluginSettingsStore: class {
    async get(): Promise<GuildPluginSettings | undefined> {
      return state.settings;
    }

    async set(settings: GuildPluginSettings): Promise<GuildPluginSettings> {
      state.settings = settings;
      return settings;
    }
  },
  PrismaAuditLogStore: class {
    async append(
      record: Omit<AuditLogRecord, "id" | "createdAt">
    ): Promise<AuditLogRecord> {
      state.logSequence += 1;
      const log = {
        ...record,
        id: `audit-${state.logSequence}`,
        createdAt: new Date(Date.UTC(2026, 4, 31, 0, 0, state.logSequence))
      };
      state.logs.unshift(log);
      return log;
    }
  }
}));

vi.mock("../../../../../lib/auth", () => ({
  requireManageableGuild: auth.requireManageableGuild
}));

const context = {
  params: Promise.resolve({ guildId: "guild-1" })
};

const dailyContentConfig = {
  enabled: true,
  schedules: [
    {
      id: "daily-morning",
      channelId: "123456789012345678",
      timezone: "Asia/Tokyo",
      postingTime: "09:00",
      content: [
        {
          slot: "quote",
          template: "今日の名言: {quote}"
        },
        {
          slot: "question",
          template: "今日の質問: 好きなゲーム内BGMは?"
        }
      ]
    }
  ]
} as const;

function postDailyContent(input: unknown) {
  return POST(
    new NextRequest("http://localhost/api/guilds/guild-1/daily-content", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input)
    }),
    context
  );
}

describe("Daily Content API route", () => {
  beforeEach(() => {
    state.settings = undefined;
    state.logs = [];
    state.logSequence = 0;
    auth.requireManageableGuild.mockReset();
    auth.requireManageableGuild.mockResolvedValue({ user: { id: "user-1" } });
  });

  it("returns saved Daily Content settings for manageable guild users", async () => {
    state.settings = {
      guildId: "guild-1",
      pluginId: DAILY_CONTENT_PLUGIN_ID,
      enabled: true,
      config: { schedules: dailyContentConfig.schedules },
      updatedByUserId: "user-1",
      updatedAt: new Date("2026-05-31T00:00:00.000Z")
    };

    const response = await GET(
      new NextRequest("http://localhost/api/guilds/guild-1/daily-content"),
      context
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      configured: true,
      enabled: true,
      schedules: dailyContentConfig.schedules
    });
  });

  it("saves enabled=false configs that satisfy the core Daily Content schema", async () => {
    const response = await postDailyContent({
      ...dailyContentConfig,
      enabled: false
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.settings).toMatchObject({
      guildId: "guild-1",
      pluginId: DAILY_CONTENT_PLUGIN_ID,
      enabled: false,
      updatedByUserId: "user-1"
    });
    expect(state.settings?.enabled).toBe(false);
    expect(isDailyContentConfig(state.settings?.config)).toBe(true);
  });

  it("records a focused audit log without copying template bodies", async () => {
    await postDailyContent(dailyContentConfig);

    expect(state.logs).toHaveLength(1);
    expect(state.logs[0]).toMatchObject({
      guildId: "guild-1",
      pluginId: DAILY_CONTENT_PLUGIN_ID,
      type: "daily_content.config.updated",
      actorUserId: "user-1"
    });
    expect(state.logs[0]?.data).toMatchObject({
      enabled: true,
      scheduleCount: 1,
      schedules: [
        {
          id: "daily-morning",
          channelId: "123456789012345678",
          timezone: "Asia/Tokyo",
          postingTime: "09:00",
          contentSlots: ["quote", "question"]
        }
      ]
    });
    expect(JSON.stringify(state.logs[0]?.data)).not.toContain("今日の名言");
    expect(JSON.stringify(state.logs[0]?.data)).not.toContain("好きなゲーム内BGM");
  });

  it("rejects validation failures without leaking submitted template bodies", async () => {
    const response = await postDailyContent({
      ...dailyContentConfig,
      schedules: [
        {
          ...dailyContentConfig.schedules[0],
          postingTime: "25:99"
        }
      ]
    });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: "VALIDATION_FAILED" });
    expect(JSON.stringify(body)).not.toContain("今日の名言");
    expect(state.settings).toBeUndefined();
    expect(state.logs).toEqual([]);
  });

  it("rejects unauthenticated reads and writes", async () => {
    auth.requireManageableGuild.mockRejectedValueOnce(new Error("UNAUTHENTICATED"));
    const getResponse = await GET(
      new NextRequest("http://localhost/api/guilds/guild-1/daily-content"),
      context
    );
    auth.requireManageableGuild.mockRejectedValueOnce(new Error("UNAUTHENTICATED"));
    const postResponse = await postDailyContent(dailyContentConfig);

    expect(getResponse.status).toBe(401);
    expect(postResponse.status).toBe(401);
    expect(state.settings).toBeUndefined();
    expect(state.logs).toEqual([]);
  });

  it("rejects unauthorized reads and writes", async () => {
    auth.requireManageableGuild.mockRejectedValueOnce(new Error("FORBIDDEN"));
    const getResponse = await GET(
      new NextRequest("http://localhost/api/guilds/guild-1/daily-content"),
      context
    );
    auth.requireManageableGuild.mockRejectedValueOnce(new Error("FORBIDDEN"));
    const postResponse = await postDailyContent(dailyContentConfig);

    expect(getResponse.status).toBe(403);
    expect(postResponse.status).toBe(403);
    expect(state.settings).toBeUndefined();
    expect(state.logs).toEqual([]);
  });
});
