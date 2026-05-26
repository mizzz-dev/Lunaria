import type { QuoteRecord } from "@lunaria/core";
import type { ChatInputCommandInteraction } from "discord.js";
import { describe, expect, it, vi } from "vitest";
import { createQuoteCommand } from "./quote.js";

const date = new Date("2026-05-26T01:00:00.000Z");
const record: QuoteRecord = {
  id: "quote-1",
  guildId: "guild-1",
  content: "A good quote.",
  sourceMessageId: "message-1",
  sourceMessageUrl: "https://discord.com/channels/guild-1/channel-1/message-1",
  sourceAuthorId: "author-1",
  sourceAuthorName: "Author",
  sourceChannelId: "channel-1",
  sourceChannelName: "general",
  sourceCreatedAt: date,
  registeredByUserId: "moderator-1",
  createdAt: date,
  updatedAt: date
};

function service() {
  return {
    add: vi.fn().mockResolvedValue(record),
    hide: vi.fn().mockResolvedValue({ ...record, hiddenAt: date }),
    randomVisible: vi.fn().mockResolvedValue(record)
  };
}

describe("quote command", () => {
  it("registers add, random and hide subcommands", () => {
    const commandJson = createQuoteCommand(service()).data.toJSON();

    expect(commandJson.name).toBe("quote");
    expect(commandJson.options?.map((option) => option.name)).toEqual([
      "add",
      "random",
      "hide"
    ]);
  });

  it("adds a fetched message from the current guild", async () => {
    const quoteService = service();
    const command = createQuoteCommand(quoteService);
    const reply = vi.fn();
    const message = {
      id: "message-1",
      guildId: "guild-1",
      content: "A good quote.",
      url: record.sourceMessageUrl,
      author: { id: "author-1", globalName: "Author", username: "author" },
      channelId: "channel-1",
      channel: { name: "general" },
      createdAt: date
    };
    const interaction = {
      guildId: "guild-1",
      guild: { ownerId: "other-user" },
      user: { id: "moderator-1" },
      memberPermissions: { has: vi.fn().mockReturnValue(true) },
      options: {
        getSubcommand: () => "add",
        getString: () => record.sourceMessageUrl
      },
      client: {
        channels: {
          fetch: vi.fn().mockResolvedValue({
            isTextBased: () => true,
            messages: { fetch: vi.fn().mockResolvedValue(message) }
          })
        }
      },
      reply
    } as unknown as ChatInputCommandInteraction;

    await command.execute(interaction);

    expect(quoteService.add).toHaveBeenCalledWith(
      expect.objectContaining({
        guildId: "guild-1",
        quote: expect.objectContaining({
          sourceMessageId: "message-1",
          sourceChannelId: "channel-1",
          content: "A good quote."
        })
      })
    );
    expect(reply).toHaveBeenCalledWith(
      expect.objectContaining({ content: "Quoteを登録しました: `quote-1`" })
    );
  });

  it("shows a random quote without enabling mentions", async () => {
    const quoteService = service();
    const command = createQuoteCommand(quoteService);
    const reply = vi.fn();
    const interaction = {
      guildId: "guild-1",
      options: { getSubcommand: () => "random" },
      reply
    } as unknown as ChatInputCommandInteraction;

    await command.execute(interaction);

    expect(quoteService.randomVisible).toHaveBeenCalledWith("guild-1");
    expect(reply).toHaveBeenCalledWith(
      expect.objectContaining({ allowedMentions: { parse: [] } })
    );
  });

  it("rejects add before fetching a message when the member cannot manage quotes", async () => {
    const quoteService = service();
    const command = createQuoteCommand(quoteService);
    const fetch = vi.fn();
    const reply = vi.fn();
    const interaction = {
      guildId: "guild-1",
      guild: { ownerId: "other-user" },
      user: { id: "viewer-1" },
      memberPermissions: { has: vi.fn().mockReturnValue(false) },
      options: {
        getSubcommand: () => "add",
        getString: () => record.sourceMessageUrl
      },
      client: { channels: { fetch } },
      reply
    } as unknown as ChatInputCommandInteraction;

    await command.execute(interaction);

    expect(fetch).not.toHaveBeenCalled();
    expect(quoteService.add).not.toHaveBeenCalled();
    expect(reply).toHaveBeenCalledWith(
      expect.objectContaining({ content: "このquote操作を行う権限がありません。" })
    );
  });
});
