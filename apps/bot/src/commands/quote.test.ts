import type { QuoteRecord } from "@lunaria/core";
import {
  ApplicationCommandType,
  type ButtonInteraction,
  type ChatInputCommandInteraction,
  type Message,
  type MessageContextMenuCommandInteraction
} from "discord.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createQuoteCommand,
  createQuoteMessageCommand,
  handleQuoteCardButtonInteraction,
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

function sourceMessage() {
  return {
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
}

describe("quote command", () => {
  beforeEach(() => {
    card.renderQuoteCard.mockReset();
    card.renderQuoteCard.mockResolvedValue(Buffer.from("png"));
  });

  it("registers add and random appearance options", () => {
    const commandJson = createQuoteCommand(service()).data.toJSON();
    const add = commandJson.options?.find((option) => option.name === "add");
    const random = commandJson.options?.find((option) => option.name === "random");

    expect(commandJson.name).toBe("quote");
    expect(commandJson.options?.map((option) => option.name)).toEqual([
      "add",
      "random",
      "hide"
    ]);
    expect(JSON.stringify(add)).toContain('"name":"theme"');
    expect(JSON.stringify(add)).toContain('"name":"design"');
    expect(JSON.stringify(add)).toContain('"name":"icon-position"');
    expect(JSON.stringify(random)).toContain('"name":"theme"');
    expect(JSON.stringify(random)).toContain('"name":"design"');
    expect(JSON.stringify(random)).toContain('"name":"icon-position"');
  });

  it("adds a fetched message with the selected appearance", async () => {
    const quoteService = service();
    const command = createQuoteCommand(quoteService);
    const editReply = vi.fn();
    const interaction = {
      guildId: "guild-1",
      guild: { ownerId: "other-user" },
      user: { id: "moderator-1" },
      memberPermissions: { has: vi.fn().mockReturnValue(true) },
      options: {
        getSubcommand: () => "add",
        getString: (name: string) => {
          if (name === "message-url") return record.sourceMessageUrl;
          if (name === "design") return "manga";
          if (name === "theme") return "color";
          return "right";
        }
      },
      client: {
        channels: {
          fetch: vi.fn().mockResolvedValue({
            isTextBased: () => true,
            messages: { fetch: vi.fn().mockResolvedValue(sourceMessage()) }
          })
        }
      },
      deferReply: vi.fn(),
      editReply
    } as unknown as ChatInputCommandInteraction;

    await command.execute(interaction);

    expect(quoteService.add).toHaveBeenCalledWith(
      expect.objectContaining({
        guildId: "guild-1",
        quote: expect.objectContaining({ sourceMessageId: "message-1" })
      })
    );
    expect(card.renderQuoteCard).toHaveBeenCalledWith(
      expect.objectContaining({
        appearance: { design: "manga", theme: "color", avatarPosition: "right" }
      })
    );
    expect(editReply).toHaveBeenCalledWith(
      expect.objectContaining({
        files: expect.any(Array),
        components: expect.any(Array)
      })
    );
  });

  it("shows a random quote using white background and right portrait", async () => {
    const quoteService = service();
    const command = createQuoteCommand(quoteService);
    const editReply = vi.fn();
    const interaction = {
      guildId: "guild-1",
      options: {
        getSubcommand: () => "random",
        getString: (name: string) => {
          if (name === "design") return "cinema";
          return name === "theme" ? "white" : "right";
        }
      },
      client: {
        users: {
          fetch: vi.fn().mockResolvedValue({
            displayAvatarURL: vi.fn().mockReturnValue("https://cdn.discordapp.com/a.png")
          })
        }
      },
      deferReply: vi.fn(),
      editReply
    } as unknown as ChatInputCommandInteraction;

    await command.execute(interaction);

    expect(quoteService.randomVisible).toHaveBeenCalledWith("guild-1");
    expect(card.renderQuoteCard).toHaveBeenCalledWith(
      expect.objectContaining({
        appearance: { design: "cinema", theme: "white", avatarPosition: "right" }
      })
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

  it("registers one configurable message application command", () => {
    const commandJson = createQuoteMessageCommand(service()).data.toJSON();

    expect(commandJson).toMatchObject({
      name: "Quote画像を作成",
      type: ApplicationCommandType.Message
    });
  });

  it("adds the selected message and exposes appearance buttons", async () => {
    const quoteService = service();
    const command = createQuoteMessageCommand(quoteService);
    const editReply = vi.fn();
    const interaction = {
      guildId: "guild-1",
      guild: { ownerId: "other-user" },
      user: { id: "moderator-1" },
      memberPermissions: { has: vi.fn().mockReturnValue(true) },
      targetMessage: sourceMessage(),
      deferReply: vi.fn(),
      editReply
    } as unknown as MessageContextMenuCommandInteraction;

    await command.execute(interaction);

    expect(card.renderQuoteCard).toHaveBeenCalledWith(
      expect.objectContaining({
        appearance: { design: "anime", theme: "color", avatarPosition: "left" }
      })
    );
    expect(editReply).toHaveBeenCalledWith(
      expect.objectContaining({
        files: expect.any(Array),
        components: expect.any(Array)
      })
    );
  });

  it("generates a card from an image-only selected message", async () => {
    const command = createQuoteMessageCommand(service());
    const editReply = vi.fn();
    const targetMessage = {
      ...sourceMessage(),
      content: "",
      attachments: {
        find: vi.fn().mockReturnValue({
          name: "terminal-capture.png",
          description: null,
          contentType: "image/png",
          url: "https://cdn.discordapp.com/attachments/channel/message/terminal.png"
        })
      }
    };
    const interaction = {
      guildId: "guild-1",
      guild: { ownerId: "other-user" },
      user: { id: "moderator-1" },
      memberPermissions: { has: vi.fn().mockReturnValue(true) },
      targetMessage,
      deferReply: vi.fn(),
      editReply
    } as unknown as MessageContextMenuCommandInteraction;

    await command.execute(interaction);

    expect(card.renderQuoteCard).toHaveBeenCalledWith(
      expect.objectContaining({
        quote: expect.objectContaining({ content: "terminal-capture.png" }),
        portraitUrl: expect.stringContaining("terminal.png")
      })
    );
    expect(editReply).toHaveBeenCalledWith(
      expect.objectContaining({ files: expect.any(Array) })
    );
  });

  it("rerenders a selected quote when an appearance button is pressed", async () => {
    const quoteService = service();
    quoteService.add.mockRejectedValueOnce({ code: "P2002" });
    const editReply = vi.fn();
    const interaction = {
      customId: "quote-card:channel-1:message-1:manga:white:right",
      guildId: "guild-1",
      guild: { ownerId: "other-user" },
      user: { id: "moderator-1" },
      memberPermissions: { has: vi.fn().mockReturnValue(true) },
      client: {
        channels: {
          fetch: vi.fn().mockResolvedValue({
            isTextBased: () => true,
            messages: { fetch: vi.fn().mockResolvedValue(sourceMessage()) }
          })
        }
      },
      deferUpdate: vi.fn(),
      editReply,
      deferred: true,
      replied: false
    } as unknown as ButtonInteraction;

    expect(await handleQuoteCardButtonInteraction(interaction, quoteService)).toBe(true);
    expect(card.renderQuoteCard).toHaveBeenCalledWith(
      expect.objectContaining({
        appearance: { design: "manga", theme: "white", avatarPosition: "right" }
      })
    );
    expect(editReply).toHaveBeenCalledWith(
      expect.objectContaining({ components: expect.any(Array) })
    );
  });

  it("keeps previously sent appearance buttons usable", async () => {
    const interaction = {
      customId: "quote-card:channel-1:message-1:white:right",
      guildId: "guild-1",
      guild: { ownerId: "other-user" },
      user: { id: "moderator-1" },
      memberPermissions: { has: vi.fn().mockReturnValue(true) },
      client: {
        channels: {
          fetch: vi.fn().mockResolvedValue({
            isTextBased: () => true,
            messages: { fetch: vi.fn().mockResolvedValue(sourceMessage()) }
          })
        }
      },
      deferUpdate: vi.fn(),
      editReply: vi.fn(),
      deferred: true,
      replied: false
    } as unknown as ButtonInteraction;

    expect(await handleQuoteCardButtonInteraction(interaction, service())).toBe(true);
    expect(card.renderQuoteCard).toHaveBeenCalledWith(
      expect.objectContaining({
        appearance: { design: "cinema", theme: "white", avatarPosition: "right" }
      })
    );
  });

  it.each([
    ["!quote", { design: "anime", theme: "color", avatarPosition: "left" }],
    ["!quote アニメ カラー 右", { design: "anime", theme: "color", avatarPosition: "right" }],
    ["!q 漫画 白 左", { design: "manga", theme: "white", avatarPosition: "left" }],
    ["!quote ネオン monochrome right", { design: "neon", theme: "black", avatarPosition: "right" }]
  ] as const)("renders the referenced message for reply command %s", async (content, appearance) => {
    const reply = vi.fn();
    const message = {
      guildId: "guild-1",
      guild: { ownerId: "other-user" },
      author: { id: "moderator-1", bot: false },
      member: { permissions: { has: vi.fn().mockReturnValue(true) } },
      content,
      reference: { messageId: "message-1" },
      fetchReference: vi.fn().mockResolvedValue(sourceMessage()),
      reply
    } as unknown as Message;

    expect(await handleQuoteReplyMessage(message, service())).toBe(true);
    expect(card.renderQuoteCard).toHaveBeenCalledWith(
      expect.objectContaining({ appearance })
    );
    expect(reply).toHaveBeenCalledWith(
      expect.objectContaining({
        files: expect.any(Array),
        components: expect.any(Array)
      })
    );
  });

  it("guides missing sources and invalid reply options", async () => {
    const noSourceReply = vi.fn();
    const invalidReply = vi.fn();
    const base = {
      guildId: "guild-1",
      author: { id: "moderator-1", bot: false }
    };

    expect(
      await handleQuoteReplyMessage(
        { ...base, content: "!quote", reply: noSourceReply } as unknown as Message,
        service()
      )
    ).toBe(true);
    expect(
      await handleQuoteReplyMessage(
        {
          ...base,
          content: "!q rainbow",
          reference: { messageId: "message-1" },
          reply: invalidReply
        } as unknown as Message,
        service()
      )
    ).toBe(true);
    expect(noSourceReply).toHaveBeenCalledWith(
      expect.objectContaining({ content: expect.stringContaining("!quote アニメ カラー 右") })
    );
    expect(invalidReply).toHaveBeenCalledWith(
      expect.objectContaining({ content: expect.stringContaining("不明な指定") })
    );
    expect(card.renderQuoteCard).not.toHaveBeenCalled();
  });
});
