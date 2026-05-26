import { describe, expect, it } from "vitest";
import { InMemoryAuditLogStore } from "./audit.js";
import { PluginRegistry } from "./plugins.js";
import {
  InMemoryQuoteStore,
  QUOTE_PLUGIN_ID,
  QuoteService,
  parseDiscordMessageUrl,
  quotePlugin,
  type QuoteSource
} from "./quote.js";

const source: QuoteSource = {
  content: "A good quote.",
  sourceMessageId: "message-1",
  sourceMessageUrl: "https://discord.com/channels/guild-1/channel-1/message-1",
  sourceAuthorId: "author-1",
  sourceAuthorName: "Author",
  sourceChannelId: "channel-1",
  sourceChannelName: "general",
  sourceCreatedAt: new Date("2026-05-26T00:00:00.000Z")
};

const moderator = {
  guildId: "guild-1",
  userId: "moderator-1",
  roleKeys: ["moderator"] as const
};

describe("Quote plugin", () => {
  it("defines metadata and validates config", () => {
    const registry = new PluginRegistry();
    registry.register(quotePlugin);

    expect(
      registry.validateConfig(QUOTE_PLUGIN_ID, { allowMemberSubmissions: false }).valid
    ).toBe(true);
    expect(
      registry.validateConfig(QUOTE_PLUGIN_ID, { allowMemberSubmissions: true }).valid
    ).toBe(false);
    expect(registry.validateConfig(QUOTE_PLUGIN_ID, {}).valid).toBe(false);
    expect(quotePlugin.auditEvents.map((event) => event.type)).toEqual([
      "quote.created",
      "quote.hidden"
    ]);
  });

  it("parses only Discord message links", () => {
    expect(
      parseDiscordMessageUrl("https://discord.com/channels/guild-1/channel-1/message-1")
    ).toEqual({
      guildId: "guild-1",
      channelId: "channel-1",
      messageId: "message-1"
    });
    expect(parseDiscordMessageUrl("https://example.com/message-1")).toBeUndefined();
  });

  it("stores and selects only visible quotes in the requested guild", async () => {
    const store = new InMemoryQuoteStore();
    const service = new QuoteService(store, new InMemoryAuditLogStore(), () => 0);

    const first = await service.add({ actor: moderator, guildId: "guild-1", quote: source });
    await service.add({
      actor: { ...moderator, guildId: "guild-2" },
      guildId: "guild-2",
      quote: {
        ...source,
        sourceMessageId: "message-2",
        sourceMessageUrl: "https://discord.com/channels/guild-2/channel-1/message-2"
      }
    });
    await service.hide({ actor: moderator, guildId: "guild-1", quoteId: first.id });

    expect(await service.randomVisible("guild-1")).toBeUndefined();
    expect((await service.listVisible("guild-2")).map((quote) => quote.guildId)).toEqual([
      "guild-2"
    ]);
  });

  it("selects random quotes from all visible records rather than a page", async () => {
    const service = new QuoteService(
      new InMemoryQuoteStore(),
      new InMemoryAuditLogStore(),
      () => 0.9999
    );

    for (let index = 0; index < 51; index += 1) {
      await service.add({
        actor: moderator,
        guildId: "guild-1",
        quote: {
          ...source,
          sourceMessageId: `message-${index}`,
          sourceMessageUrl: `https://discord.com/channels/guild-1/channel-1/message-${index}`
        }
      });
    }

    expect((await service.randomVisible("guild-1"))?.sourceMessageId).toBe("message-0");
  });

  it("writes create and hide audit records without copying quote content", async () => {
    const logs = new InMemoryAuditLogStore();
    const service = new QuoteService(
      new InMemoryQuoteStore(),
      logs,
      () => 0,
      () => new Date("2026-05-26T01:00:00.000Z")
    );

    const created = await service.add({
      actor: moderator,
      guildId: "guild-1",
      quote: source
    });
    await service.hide({ actor: moderator, guildId: "guild-1", quoteId: created.id });

    const records = await logs.listByGuild("guild-1");
    expect(records.map((record) => record.type)).toEqual(["quote.hidden", "quote.created"]);
    expect(records[1]?.data).not.toHaveProperty("content");
  });

  it("rejects unauthorized and cross-guild management", async () => {
    const service = new QuoteService(new InMemoryQuoteStore(), new InMemoryAuditLogStore());
    const viewer = {
      guildId: "guild-1",
      userId: "viewer-1",
      roleKeys: ["viewer"] as const
    };

    await expect(
      service.add({ actor: viewer, guildId: "guild-1", quote: source })
    ).rejects.toThrow("FORBIDDEN");
    await expect(
      service.add({ actor: moderator, guildId: "guild-2", quote: source })
    ).rejects.toThrow("FORBIDDEN");
    await expect(
      service.add({
        actor: moderator,
        guildId: "guild-1",
        quote: {
          ...source,
          sourceMessageUrl: "https://discord.com/channels/guild-2/channel-1/message-1"
        }
      })
    ).rejects.toThrow("INVALID_QUOTE_SOURCE");
    await expect(
      service.add({ actor: moderator, guildId: "guild-1", quote: { ...source, content: "" } })
    ).rejects.toThrow("INVALID_QUOTE_SOURCE");
  });
});
