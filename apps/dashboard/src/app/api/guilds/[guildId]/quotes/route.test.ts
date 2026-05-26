import type { AuditLogRecord, QuoteRecord } from "@lunaria/core";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./route";
import { POST as hideQuote } from "./[quoteId]/hide/route";

const now = new Date("2026-05-26T01:00:00.000Z");
const quote: QuoteRecord = {
  id: "quote-1",
  guildId: "guild-1",
  content: "A good quote.",
  sourceMessageId: "message-1",
  sourceMessageUrl: "https://discord.com/channels/guild-1/channel-1/message-1",
  sourceAuthorId: "author-1",
  sourceAuthorName: "Author",
  sourceChannelId: "channel-1",
  sourceChannelName: "general",
  sourceCreatedAt: now,
  registeredByUserId: "user-1",
  createdAt: now,
  updatedAt: now
};

const state = vi.hoisted(() => ({
  quotes: [] as QuoteRecord[],
  logs: [] as AuditLogRecord[]
}));

const auth = vi.hoisted(() => ({
  requireManageableGuild: vi.fn()
}));

vi.mock("@lunaria/db", () => ({
  prisma: {},
  PrismaQuoteStore: class {
    async create(input: Omit<QuoteRecord, "id" | "createdAt" | "updatedAt">) {
      const created = { ...input, id: "quote-1", createdAt: now, updatedAt: now };
      state.quotes.push(created);
      return created;
    }

    async listVisibleByGuild(guildId: string, limit?: number) {
      const quotes = state.quotes.filter((item) => item.guildId === guildId && !item.hiddenAt);
      return typeof limit === "number" ? quotes.slice(0, limit) : quotes;
    }

    async hide(guildId: string, quoteId: string, actorUserId: string, hiddenAt: Date) {
      const found = state.quotes.find(
        (item) => item.guildId === guildId && item.id === quoteId && !item.hiddenAt
      );
      if (!found) return undefined;
      const hidden = { ...found, hiddenAt, hiddenByUserId: actorUserId };
      state.quotes = state.quotes.map((item) => (item === found ? hidden : item));
      return hidden;
    }
  },
  PrismaAuditLogStore: class {
    async append(record: Omit<AuditLogRecord, "id" | "createdAt">) {
      const created = { ...record, id: `audit-${state.logs.length + 1}`, createdAt: now };
      state.logs.unshift(created);
      return created;
    }
  }
}));

vi.mock("../../../../../lib/auth", () => ({
  requireManageableGuild: auth.requireManageableGuild
}));

const context = { params: Promise.resolve({ guildId: "guild-1" }) };
const hideContext = { params: Promise.resolve({ guildId: "guild-1", quoteId: "quote-1" }) };

function addQuote() {
  return POST(
    new NextRequest("http://localhost/api/guilds/guild-1/quotes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...quote,
        id: undefined,
        registeredByUserId: undefined,
        createdAt: undefined,
        updatedAt: undefined
      })
    }),
    context
  );
}

describe("Quote API route", () => {
  beforeEach(() => {
    state.quotes = [];
    state.logs = [];
    auth.requireManageableGuild.mockReset();
    auth.requireManageableGuild.mockResolvedValue({ user: { id: "user-1" } });
  });

  it("registers and lists visible guild quotes with an audit record", async () => {
    const created = await addQuote();
    const listed = await GET(
      new NextRequest("http://localhost/api/guilds/guild-1/quotes"),
      context
    );

    expect(created.status).toBe(201);
    expect((await listed.json()).quotes).toHaveLength(1);
    expect(state.logs[0]?.type).toBe("quote.created");
    expect(state.logs[0]?.data).not.toHaveProperty("content");
  });

  it("hides a quote and writes an audit record", async () => {
    await addQuote();
    const response = await hideQuote(
      new NextRequest("http://localhost/api/guilds/guild-1/quotes/quote-1/hide", {
        method: "POST"
      }),
      hideContext
    );

    expect(response.status).toBe(200);
    expect(state.logs.map((log) => log.type)).toEqual(["quote.hidden", "quote.created"]);
    expect(state.quotes[0]?.hiddenByUserId).toBe("user-1");
  });

  it("rejects unauthenticated reads and writes", async () => {
    auth.requireManageableGuild.mockRejectedValue(new Error("UNAUTHENTICATED"));

    const getResponse = await GET(
      new NextRequest("http://localhost/api/guilds/guild-1/quotes"),
      context
    );
    const postResponse = await addQuote();

    expect(getResponse.status).toBe(401);
    expect(postResponse.status).toBe(401);
    expect(state.quotes).toEqual([]);
  });

  it("rejects source messages outside the target guild", async () => {
    const response = await POST(
      new NextRequest("http://localhost/api/guilds/guild-1/quotes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...quote,
          sourceMessageUrl: "https://discord.com/channels/guild-2/channel-1/message-1"
        })
      }),
      context
    );

    expect(response.status).toBe(400);
    expect(state.quotes).toEqual([]);
  });
});
