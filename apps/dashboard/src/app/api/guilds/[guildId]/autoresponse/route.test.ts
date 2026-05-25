import type {
  AuditLogRecord,
  GuildPluginSettings,
  RuleDefinition
} from "@lunaria/core";
import { buildAutoResponseRules } from "@lunaria/core";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./route";

const state = vi.hoisted(() => ({
  settings: undefined as GuildPluginSettings | undefined,
  rules: [] as RuleDefinition[],
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
  PrismaRuleStore: class {
    async listByGuildPlugin(): Promise<RuleDefinition[]> {
      return state.rules;
    }

    async replaceByGuildPlugin(
      _guildId: string,
      _pluginId: string,
      rules: readonly RuleDefinition[]
    ): Promise<RuleDefinition[]> {
      state.rules = [...rules];
      return state.rules;
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
        createdAt: new Date(Date.UTC(2026, 4, 25, 0, 0, state.logSequence))
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

const helloRule = {
  id: "hello",
  enabled: true,
  keyword: "hello",
  response: "world",
  cooldownSeconds: 0,
  mentionAuthor: false
};

function postConfig(input: { enabled: boolean; rules: Array<typeof helloRule> }) {
  return POST(
    new NextRequest("http://localhost/api/guilds/guild-1/autoresponse", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input)
    }),
    context
  );
}

describe("AutoResponse API route", () => {
  beforeEach(() => {
    state.settings = undefined;
    state.rules = [];
    state.logs = [];
    state.logSequence = 0;
    auth.requireManageableGuild.mockReset();
    auth.requireManageableGuild.mockResolvedValue({ user: { id: "user-1" } });
  });

  it("records an initial save with enabled and added-rule changes", async () => {
    const response = await postConfig({ enabled: true, rules: [helloRule] });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.changed).toBe(true);
    expect(state.logs).toHaveLength(1);
    expect(state.logs[0]?.data).toMatchObject({
      created: true,
      enabledChange: { before: null, after: true },
      ruleChanges: [
        {
          kind: "added",
          ruleId: "hello",
          fields: [
            "enabled",
            "keyword",
            "response",
            "channelId",
            "cooldownSeconds",
            "mentionAuthor"
          ]
        }
      ]
    });
  });

  it("records rule additions, edits, removals and deleting every rule", async () => {
    const byeRule = {
      ...helloRule,
      id: "bye",
      keyword: "bye",
      response: "moon"
    };

    await postConfig({ enabled: true, rules: [helloRule] });
    await postConfig({ enabled: true, rules: [helloRule, byeRule] });
    expect(state.logs[0]?.data).toMatchObject({
      ruleChanges: [{ kind: "added", ruleId: "bye" }]
    });

    const editedHello = { ...helloRule, response: "awake" };
    await postConfig({ enabled: true, rules: [editedHello, byeRule] });
    expect(state.logs[0]?.data).toMatchObject({
      ruleChanges: [{ kind: "updated", ruleId: "hello", fields: ["response"] }]
    });

    await postConfig({ enabled: true, rules: [editedHello] });
    expect(state.logs[0]?.data).toMatchObject({
      ruleChanges: [{ kind: "removed", ruleId: "bye" }]
    });

    await postConfig({ enabled: true, rules: [] });
    expect(state.logs[0]?.data).toMatchObject({
      ruleCount: 0,
      ruleChanges: [{ kind: "removed", ruleId: "hello" }]
    });
  });

  it("does not append an audit log when identical content is saved again", async () => {
    await postConfig({ enabled: true, rules: [helloRule] });
    const response = await postConfig({ enabled: true, rules: [helloRule] });
    const body = await response.json();

    expect(body.changed).toBe(false);
    expect(state.logs).toHaveLength(1);
  });

  it("returns a saved empty rule list without falling back to rule records", async () => {
    state.settings = {
      guildId: "guild-1",
      pluginId: "autoresponse",
      enabled: true,
      config: { rules: [] },
      updatedByUserId: "user-1",
      updatedAt: new Date("2026-05-25T00:00:00.000Z")
    };
    state.rules = buildAutoResponseRules({
      guildId: "guild-1",
      rules: [helloRule]
    });

    const response = await GET(
      new NextRequest("http://localhost/api/guilds/guild-1/autoresponse"),
      context
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      configured: true,
      enabled: true,
      rules: []
    });
  });
});
