import type { PrismaClient } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PrismaQuoteStore } from "./quotes.js";

const createdAt = new Date("2026-05-26T01:00:00.000Z");
const record = {
  id: "quote-1",
  guildId: "guild-1",
  content: "A good quote.",
  sourceMessageId: "message-1",
  sourceMessageUrl: "https://discord.com/channels/guild-1/channel-1/message-1",
  sourceAuthorId: "author-1",
  sourceAuthorName: "Author",
  sourceChannelId: "channel-1",
  sourceChannelName: "general",
  sourceCreatedAt: createdAt,
  registeredByUserId: "moderator-1",
  hiddenAt: null,
  hiddenByUserId: null,
  createdAt,
  updatedAt: createdAt
};

const client = {
  guild: {
    upsert: vi.fn()
  },
  quote: {
    create: vi.fn(),
    findMany: vi.fn(),
    updateMany: vi.fn(),
    findFirst: vi.fn()
  }
};

describe("PrismaQuoteStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    client.guild.upsert.mockResolvedValue({});
    client.quote.create.mockResolvedValue(record);
    client.quote.findMany.mockResolvedValue([record]);
    client.quote.updateMany.mockResolvedValue({ count: 1 });
    client.quote.findFirst.mockResolvedValue({
      ...record,
      hiddenAt: createdAt,
      hiddenByUserId: "moderator-1"
    });
  });

  it("lists only visible quotes for one guild", async () => {
    const store = new PrismaQuoteStore(client as unknown as PrismaClient);
    const quotes = await store.listVisibleByGuild("guild-1", 10);

    expect(client.quote.findMany).toHaveBeenCalledWith({
      where: { guildId: "guild-1", hiddenAt: null },
      orderBy: { createdAt: "desc" },
      take: 10
    });
    expect(quotes[0]?.guildId).toBe("guild-1");
  });

  it("does not truncate the candidate set when no list limit is requested", async () => {
    const store = new PrismaQuoteStore(client as unknown as PrismaClient);
    await store.listVisibleByGuild("guild-1");

    expect(client.quote.findMany).toHaveBeenCalledWith({
      where: { guildId: "guild-1", hiddenAt: null },
      orderBy: { createdAt: "desc" }
    });
  });

  it("scopes hide operations to a visible quote in one guild", async () => {
    const store = new PrismaQuoteStore(client as unknown as PrismaClient);
    const hiddenAt = new Date("2026-05-26T02:00:00.000Z");
    const quote = await store.hide("guild-1", "quote-1", "moderator-1", hiddenAt);

    expect(client.quote.updateMany).toHaveBeenCalledWith({
      where: { id: "quote-1", guildId: "guild-1", hiddenAt: null },
      data: { hiddenAt, hiddenByUserId: "moderator-1" }
    });
    expect(quote?.hiddenByUserId).toBe("moderator-1");
  });
});
