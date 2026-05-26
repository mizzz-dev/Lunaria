import type { AuditLogQuery, AuditLogRecord } from "@lunaria/core";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const state = vi.hoisted(() => ({
  logs: [] as AuditLogRecord[],
  listByGuild: vi.fn()
}));

const auth = vi.hoisted(() => ({
  requireManageableGuild: vi.fn()
}));

vi.mock("@lunaria/db", () => ({
  prisma: {},
  PrismaAuditLogStore: class {
    async listByGuild(guildId: string, query?: number | AuditLogQuery) {
      return state.listByGuild(guildId, query);
    }
  }
}));

vi.mock("../../../../../lib/auth", () => ({
  requireManageableGuild: auth.requireManageableGuild
}));

const context = {
  params: Promise.resolve({ guildId: "guild-1" })
};

function getLogs(category?: string) {
  const query = category ? `?category=${category}` : "";
  return GET(
    new NextRequest(`http://localhost/api/guilds/guild-1/audit-logs${query}`),
    context
  );
}

describe("Audit Log API route", () => {
  beforeEach(() => {
    state.logs = [
      {
        id: "configuration",
        guildId: "guild-1",
        pluginId: "autoresponse",
        type: "autoresponse.config.updated",
        actorUserId: "user-1",
        data: {},
        createdAt: new Date("2026-05-25T02:00:00.000Z")
      },
      {
        id: "activity",
        guildId: "guild-1",
        pluginId: "autoresponse",
        type: "autoresponse.rule.matched",
        actorUserId: "user-1",
        data: {},
        createdAt: new Date("2026-05-25T01:00:00.000Z")
      }
    ];
    state.listByGuild.mockReset();
    state.listByGuild.mockImplementation(
      async (_guildId: string, query?: number | AuditLogQuery) => {
        const options = typeof query === "number" ? { limit: query } : query;
        return state.logs
          .filter((log) => !options?.type || log.type === options.type)
          .slice(0, options?.limit);
      }
    );
    auth.requireManageableGuild.mockReset();
    auth.requireManageableGuild.mockResolvedValue({ user: { id: "user-1" } });
  });

  it("returns recent logs for category=all", async () => {
    const response = await getLogs("all");
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.category).toBe("all");
    expect(body.logs.map((log: { id: string }) => log.id)).toEqual([
      "configuration",
      "activity"
    ]);
    expect(state.listByGuild).toHaveBeenCalledWith("guild-1", { limit: 25 });
  });

  it("returns only configuration updates for category=configuration", async () => {
    const response = await getLogs("configuration");
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.logs.map((log: { id: string }) => log.id)).toEqual(["configuration"]);
    expect(state.listByGuild).toHaveBeenCalledWith("guild-1", {
      limit: 25,
      type: "autoresponse.config.updated"
    });
  });

  it("returns only reply activity for category=activity", async () => {
    const response = await getLogs("activity");
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.logs.map((log: { id: string }) => log.id)).toEqual(["activity"]);
    expect(state.listByGuild).toHaveBeenCalledWith("guild-1", {
      limit: 25,
      type: "autoresponse.rule.matched"
    });
  });

  it("rejects an invalid category", async () => {
    const response = await getLogs("invalid");

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "INVALID_CATEGORY" });
    expect(state.listByGuild).not.toHaveBeenCalled();
  });

  it.each([
    ["UNAUTHENTICATED", 401],
    ["FORBIDDEN", 403]
  ])("does not expose logs when authorization fails with %s", async (message, status) => {
    auth.requireManageableGuild.mockRejectedValue(new Error(message));

    const response = await getLogs("all");

    expect(response.status).toBe(status);
    expect(await response.json()).toEqual({ error: message });
    expect(state.listByGuild).not.toHaveBeenCalled();
  });
});
