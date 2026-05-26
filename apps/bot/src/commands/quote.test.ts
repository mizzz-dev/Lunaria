import type { QuoteRecord } from "@lunaria/core";
import {
  ApplicationCommandType,
  type ChatInputCommandInteraction,
  type Message,
  type MessageContextMenuCommandInteraction
} from "discord.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createQuoteCommand,
  createQuoteMessageCommand,
  handleQuoteReplyMessage
} from "./quote.js";

const card = vi.hoisted(() => ({
  renderQuoteCard: vi.fn()
}));

vi.mock("../quote-card.js", () => ({
  renderQuoteCard: card.renderQuoteCard
}));

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
  beforeEach(() => {
    card.renderQuoteCard.mockReset();
    card.renderQuoteCard.mockResolvedValue(Buffer.from("png"));
  });

  it("registers add, random and hide subcommands", () => {
    const commandJson = createQuoteCommand(service()).data.toJSON();
    const add = commandJson.options?.find((option) => option.name === "add");
    const random = commandJson.options?.find((option) => option.name === "random");

    expect(commandJson.name).toBe("quote");
    expect(commandJson.options?.map((option) => option.name)).toEqual([
      "add",
      "random",
      "hide"
    ]);
    expect(JSON.stringify(add)).toContain('"name":"style"');
    expect(JSON.stringify(random)).toContain('"name":"style"');
  });

  it("adds a fetched message from the current guild", async () => {
    const quoteService = service();
    const command = createQuoteCommand(quoteService);
    const deferReply = vi.fn();
    const editReply = vi.fn();
    const message = {
      id: "message-1",
      guildId: "guild-1",
      content: "A good quote.",
      url: record.sourceMessageUrl,
      channelId: "channel-1",
      channel: { name: "general" },
      createdAt: date,
      author: {
        id: "author-1",
        globalName: "Author",
        username: "author",
        displayAvatarURL: vi.fn().mockReturnValue("https://cdn.discordapp.com/a.png")
      }
    };
    const interaction = {
      guildId: "guild-1",
      guild: { ownerId: "other-user" },
      user: { id: "moderator-1" },
      memberPermissions: { has: vi.fn().mockReturnValue(true) },
      options: {
        getSubcommand: () => "add",
        getString: (name: string) =>
          name === "message-url" ? record.sourceMessageUrl : "color"
      },
      client: {
        channels: {
          fetch: vi.fn().mockResolvedValue({
            isTextBased: () => true,
            messages: { fetch: vi.fn().mockResolvedValue(message) }
          })
        }
      },
      deferReply,
      editReply
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
    expect(deferReply).toHaveBeenCalled();
    expect(card.renderQuoteCard).toHaveBeenCalledWith(
      expect.objectContaining({ style: "color" })
    );
    expect(editReply).toHaveBeenCalledWith(
      expect.objectContaining({ files: expect.any(Array) })
    );
  });

  it("shows a random quote without enabling mentions", async () => {
    const quoteService = service();
    const command = createQuoteCommand(quoteService);
    const deferReply = vi.fn();
    const editReply = vi.fn();
    const interaction = {
      guildId: "guild-1",
      options: {
        getSubcommand: () => "random",
        getString: () => "monochrome"
      },
      client: {
        users: {
          fetch: vi.fn().mockResolvedValue({
            displayAvatarURL: vi.fn().mockReturnValue("https://cdn.discordapp.com/a.png")
          })
        }
      },
      deferReply,
      editReply
    } as unknown as ChatInputCommandInteraction;

    await command.execute(interaction);

    expect(quoteService.randomVisible).toHaveBeenCalledWith("guild-1");
    expect(deferReply).toHaveBeenCalled();
    expect(card.renderQuoteCard).toHaveBeenCalledWith(
      expect.objectContaining({ style: "monochrome" })
    );
    expect(editReply).toHaveBeenCalledWith(
      expect.objectContaining({ files: expect.any(Array) })
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

  it("registers a message application command for direct quote capture", () => {
    const monochrome = createQuoteMessageCommand(service(), "monochrome").data.toJSON();
    const color = createQuoteMessageCommand(service(), "color").data.toJSON();

    expect(monochrome).toMatchObject({
      name: "Quote画像 (白黒)",
      type: ApplicationCommandType.Message
    });
    expect(color).toMatchObject({
      name: "Quote画像 (カラー)",
      type: ApplicationCommandType.Message
    });
  });

  it("adds the selected message through the application command", async () => {
    const quoteService = service();
    const command = createQuoteMessageCommand(quoteService, "color");
    const deferReply = vi.fn();
    const editReply = vi.fn();
    const interaction = {
      guildId: "guild-1",
      guild: { ownerId: "other-user" },
      user: { id: "moderator-1" },
      memberPermissions: { has: vi.fn().mockReturnValue(true) },
      targetMessage: {
        id: "message-1",
        guildId: "guild-1",
        content: "A good quote.",
        url: record.sourceMessageUrl,
        author: {
          id: "author-1",
          globalName: "Author",
          username: "author",
          displayAvatarURL: vi.fn().mockReturnValue("https://cdn.discordapp.com/a.png")
        },
        channelId: "channel-1",
        channel: { name: "general" },
        createdAt: date
      },
      deferReply,
      editReply
    } as unknown as MessageContextMenuCommandInteraction;

    await command.execute(interaction);

    expect(quoteService.add).toHaveBeenCalledWith(
      expect.objectContaining({
        guildId: "guild-1",
        quote: expect.objectContaining({ sourceMessageId: "message-1" })
      })
    );
    expect(card.renderQuoteCard).toHaveBeenCalledWith(
      expect.objectContaining({ style: "color" })
    );
    expect(editReply).toHaveBeenCalledWith(
      expect.objectContaining({ files: expect.any(Array) })
    );
  });

  it("regenerates an already saved selected message in another style", async () => {
    const quoteService = service();
    quoteService.add.mockRejectedValueOnce({ code: "P2002" });
    const command = createQuoteMessageCommand(quoteService, "monochrome");
    const editReply = vi.fn();
    const interaction = {
      guildId: "guild-1",
      guild: { ownerId: "other-user" },
      user: { id: "moderator-1" },
      memberPermissions: { has: vi.fn().mockReturnValue(true) },
      targetMessage: {
        id: "message-1",
        guildId: "guild-1",
        content: "A good quote.",
        url: record.sourceMessageUrl,
        author: {
          id: "author-1",
          globalName: "Author",
          username: "author",
          displayAvatarURL: vi.fn().mockReturnValue("https://cdn.discordapp.com/a.png")
        },
        channelId: "channel-1",
        channel: { name: "general" },
        createdAt: date
      },
      deferReply: vi.fn(),
      editReply
    } as unknown as MessageContextMenuCommandInteraction;

    await command.execute(interaction);

    expect(card.renderQuoteCard).toHaveBeenCalledWith(
      expect.objectContaining({ style: "monochrome" })
    );
    expect(editReply).toHaveBeenCalledWith(
      expect.objectContaining({ files: expect.any(Array) })
    );
  });

  it.each([
    ["!quote", "monochrome"],
    ["!quote color", "color"],
    ["!quote カラー", "color"]
  ] as const)("renders the referenced message for reply command %s", async (content, style) => {
    const quoteService = service();
    const reply = vi.fn();
    const source = {
      id: "message-1",
      guildId: "guild-1",
      content: "A good quote.",
      url: record.sourceMessageUrl,
      author: {
        id: "author-1",
        globalName: "Author",
        username: "author",
        displayAvatarURL: vi.fn().mockReturnValue("https://cdn.discordapp.com/a.png")
      },
      channelId: "channel-1",
      channel: { name: "general" },
      createdAt: date
    };
    const message = {
      guildId: "guild-1",
      guild: { ownerId: "other-user" },
      author: { id: "moderator-1", bot: false },
      member: { permissions: { has: vi.fn().mockReturnValue(true) } },
      content,
      reference: { messageId: "message-1" },
      fetchReference: vi.fn().mockResolvedValue(source),
      reply
    } as unknown as Message;

    expect(await handleQuoteReplyMessage(message, quoteService)).toBe(true);
    expect(card.renderQuoteCard).toHaveBeenCalledWith(
      expect.objectContaining({ style })
    );
    expect(reply).toHaveBeenCalledWith(
      expect.objectContaining({ files: expect.any(Array) })
    );
  });

  it("guides a reply command that does not reference a source message", async () => {
    const reply = vi.fn();
    const message = {
      guildId: "guild-1",
      author: { id: "moderator-1", bot: false },
      content: "!quote",
      reply
    } as unknown as Message;

    expect(await handleQuoteReplyMessage(message, service())).toBe(true);
    expect(reply).toHaveBeenCalledWith(
      expect.objectContaining({ content: expect.stringContaining("返信して") })
    );
    expect(card.renderQuoteCard).not.toHaveBeenCalled();
  });
});
