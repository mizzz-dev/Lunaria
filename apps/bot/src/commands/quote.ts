import {
  QuoteService,
  hasPermission,
  parseDiscordMessageUrl,
  type QuoteRecord,
  type RbacActor
} from "@lunaria/core";
import { prisma, PrismaAuditLogStore, PrismaQuoteStore } from "@lunaria/db";
import {
  ApplicationCommandType,
  AttachmentBuilder,
  ChatInputCommandInteraction,
  ContextMenuCommandBuilder,
  MessageContextMenuCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type Message
} from "discord.js";
import { renderQuoteCard, type QuoteCardStyle } from "../quote-card.js";

type QuoteCommandService = Pick<QuoteService, "add" | "hide" | "randomVisible">;
type QuoteManagementInteraction =
  | ChatInputCommandInteraction
  | MessageContextMenuCommandInteraction;

export function createQuoteCommand(service: QuoteCommandService) {
  return {
    data: new SlashCommandBuilder()
      .setName("quote")
      .setDescription("Community quote utilities")
      .addSubcommand((subcommand) =>
        subcommand
          .setName("add")
          .setDescription("Save a Discord message as a quote")
          .addStringOption((option) =>
            option
              .setName("message-url")
              .setDescription("Discord message URL to save")
              .setRequired(true)
          )
          .addStringOption((option) => styleOption(option))
      )
      .addSubcommand((subcommand) =>
        subcommand
          .setName("random")
          .setDescription("Show a random quote")
          .addStringOption((option) => styleOption(option))
      )
      .addSubcommand((subcommand) =>
        subcommand
          .setName("hide")
          .setDescription("Hide a saved quote")
          .addStringOption((option) =>
            option.setName("quote-id").setDescription("Quote ID to hide").setRequired(true)
          )
      ),

    async execute(interaction: ChatInputCommandInteraction): Promise<void> {
      const guildId = interaction.guildId;
      if (!guildId) {
        await interaction.reply({ content: "Guildでのみ利用できます。", ephemeral: true });
        return;
      }

      try {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === "random") {
          const quote = await service.randomVisible(guildId);
          if (!quote) {
            await interaction.reply({
              content: "表示できるquoteがまだありません。",
              allowedMentions: { parse: [] }
            });
            return;
          }

          await interaction.deferReply();
          const avatarUrl = await fetchUserAvatar(interaction, quote.sourceAuthorId);
          await interaction.editReply({
            files: [await quoteImageAttachment(quote, avatarUrl, selectedStyle(interaction))]
          });
          return;
        }

        const actor = quoteActor(interaction, guildId);

        if (subcommand === "add") {
          if (!hasPermission(actor, "quotes:create")) {
            throw new Error("FORBIDDEN");
          }
          const source = await fetchQuoteMessage(
            interaction,
            interaction.options.getString("message-url", true),
            guildId
          );
          await interaction.deferReply();
          await interaction.editReply({
            files: [
              await createQuoteImageFromMessage(
                service,
                guildId,
                actor,
                source,
                selectedStyle(interaction)
              )
            ]
          });
          return;
        }

        if (subcommand === "hide") {
          await service.hide({
            actor,
            guildId,
            quoteId: interaction.options.getString("quote-id", true)
          });
          await interaction.reply({ content: "Quoteを非表示にしました。", ephemeral: true });
          return;
        }

        await interaction.reply({ content: "未知のquote操作です。", ephemeral: true });
      } catch (error) {
        logUnexpectedQuoteError(error);
        await replyWithError(interaction, error);
      }
    }
  };
}

export function createQuoteMessageCommand(
  service: QuoteCommandService,
  style: QuoteCardStyle
) {
  return {
    data: new ContextMenuCommandBuilder()
      .setName(style === "monochrome" ? "Quote画像 (白黒)" : "Quote画像 (カラー)")
      .setType(ApplicationCommandType.Message),

    async execute(interaction: MessageContextMenuCommandInteraction): Promise<void> {
      const guildId = interaction.guildId;
      if (!guildId) {
        await interaction.reply({ content: "Guildでのみ利用できます。", ephemeral: true });
        return;
      }

      try {
        await interaction.deferReply();
        await interaction.editReply({
          files: [
            await createQuoteImageFromMessage(
              service,
              guildId,
              quoteActor(interaction, guildId),
              interaction.targetMessage,
              style
            )
          ]
        });
      } catch (error) {
        logUnexpectedQuoteError(error);
        await replyWithError(interaction, error);
      }
    }
  };
}

async function createQuoteImageFromMessage(
  service: QuoteCommandService,
  guildId: string,
  actor: RbacActor,
  source: Message,
  style: QuoteCardStyle
): Promise<AttachmentBuilder> {
  if (!hasPermission(actor, "quotes:create")) {
    throw new Error("FORBIDDEN");
  }

  const quote = {
    content: source.content,
    sourceMessageId: source.id,
    sourceMessageUrl: source.url,
    sourceAuthorId: source.author.id,
    sourceAuthorName: source.author.globalName ?? source.author.username,
    sourceChannelId: source.channelId,
    sourceChannelName: channelName(source),
    sourceCreatedAt: source.createdAt
  };

  try {
    await service.add({ actor, guildId, quote });
  } catch (error) {
    if (!hasErrorCode(error, "P2002")) {
      throw error;
    }
  }

  return quoteImageAttachment(
    quote,
    source.author.displayAvatarURL({ extension: "png", size: 512 }),
    style
  );
}

function quoteActor(interaction: QuoteManagementInteraction, guildId: string): RbacActor {
  const isOwner = interaction.guild?.ownerId === interaction.user.id;
  const permissions = interaction.memberPermissions;
  const canAdminister =
    permissions?.has(PermissionFlagsBits.Administrator) ||
    permissions?.has(PermissionFlagsBits.ManageGuild);
  const canModerate = permissions?.has(PermissionFlagsBits.ManageMessages);

  return {
    guildId,
    userId: interaction.user.id,
    roleKeys: isOwner
      ? ["owner"]
      : canAdminister
        ? ["admin"]
        : canModerate
          ? ["moderator"]
          : ["viewer"]
  };
}

function quoteMessageActor(message: Message, guildId: string): RbacActor {
  const permissions = message.member?.permissions;
  const isOwner = message.guild?.ownerId === message.author.id;
  const canAdminister =
    permissions?.has(PermissionFlagsBits.Administrator) ||
    permissions?.has(PermissionFlagsBits.ManageGuild);
  const canModerate = permissions?.has(PermissionFlagsBits.ManageMessages);

  return {
    guildId,
    userId: message.author.id,
    roleKeys: isOwner
      ? ["owner"]
      : canAdminister
        ? ["admin"]
        : canModerate
          ? ["moderator"]
          : ["viewer"]
  };
}

async function fetchQuoteMessage(
  interaction: ChatInputCommandInteraction,
  url: string,
  guildId: string
): Promise<Message> {
  const reference = parseDiscordMessageUrl(url);
  if (!reference || reference.guildId !== guildId) {
    throw new Error("INVALID_QUOTE_SOURCE");
  }

  const channel = await interaction.client.channels.fetch(reference.channelId);
  if (!channel?.isTextBased() || !("messages" in channel)) {
    throw new Error("INVALID_QUOTE_SOURCE");
  }

  const message = await channel.messages.fetch(reference.messageId);
  if (message.guildId !== guildId || !message.content.trim()) {
    throw new Error("INVALID_QUOTE_SOURCE");
  }

  return message;
}

function channelName(message: Message): string {
  return "name" in message.channel && message.channel.name
    ? message.channel.name
    : message.channelId;
}

function styleOption<T extends { setName(name: string): T; setDescription(description: string): T; addChoices(...choices: { name: string; value: string }[]): T }>(
  option: T
): T {
  return option
    .setName("style")
    .setDescription("Quote画像のスタイル")
    .addChoices(
      { name: "白黒", value: "monochrome" },
      { name: "カラー", value: "color" }
    );
}

function selectedStyle(interaction: ChatInputCommandInteraction): QuoteCardStyle {
  return interaction.options.getString("style") === "color" ? "color" : "monochrome";
}

async function quoteImageAttachment(
  quote: Pick<QuoteRecord, "content" | "sourceAuthorName" | "sourceChannelName" | "sourceCreatedAt">,
  avatarUrl: string | undefined,
  style: QuoteCardStyle
): Promise<AttachmentBuilder> {
  const image = await renderQuoteCard({
    quote,
    style,
    ...(avatarUrl ? { avatarUrl } : {})
  });
  return new AttachmentBuilder(image, {
    name: `lunaria-quote-${style}.png`
  });
}

async function fetchUserAvatar(
  interaction: ChatInputCommandInteraction,
  userId: string
): Promise<string | undefined> {
  try {
    const user = await interaction.client.users.fetch(userId);
    return user.displayAvatarURL({ extension: "png", size: 512 });
  } catch {
    return undefined;
  }
}

async function replyWithError(
  interaction: QuoteManagementInteraction,
  error: unknown
): Promise<void> {
  const content = commandErrorMessage(error);
  if (interaction.deferred || interaction.replied) {
    await interaction.editReply({ content });
    return;
  }

  await interaction.reply({ content, ephemeral: true });
}

export async function handleQuoteReplyMessage(
  message: Message,
  service: QuoteCommandService = new QuoteService(
    new PrismaQuoteStore(prisma),
    new PrismaAuditLogStore(prisma)
  )
): Promise<boolean> {
  if (!message.guildId || message.author.bot) {
    return false;
  }

  const match = /^!quote(?:\s+(monochrome|mono|white|bw|白黒|color|カラー))?$/iu.exec(
    message.content.trim()
  );
  if (!match) {
    return false;
  }

  if (!message.reference?.messageId) {
    await message.reply({
      content: "画像化したいメッセージへ返信して `!quote` または `!quote color` を送ってください。",
      allowedMentions: { repliedUser: false }
    });
    return true;
  }

  const style: QuoteCardStyle =
    match[1] === "color" || match[1] === "カラー" ? "color" : "monochrome";

  try {
    const source = await message.fetchReference();
    const file = await createQuoteImageFromMessage(
      service,
      message.guildId,
      quoteMessageActor(message, message.guildId),
      source,
      style
    );
    await message.reply({
      files: [file],
      allowedMentions: { repliedUser: false }
    });
  } catch (error) {
    logUnexpectedQuoteError(error);
    await message.reply({
      content: commandErrorMessage(error),
      allowedMentions: { repliedUser: false }
    });
  }

  return true;
}

function commandErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message === "FORBIDDEN") {
    return "このquote操作を行う権限がありません。";
  }
  if (error instanceof Error && error.message === "QUOTE_NOT_FOUND") {
    return "対象のquoteが見つかりません。";
  }
  if (error instanceof Error && error.message === "INVALID_QUOTE_SOURCE") {
    return "同じGuildの本文付きDiscordメッセージURLを指定してください。";
  }
  if (hasErrorCode(error, "P2002")) {
    return "このメッセージは既にQuoteへ登録されています。";
  }
  return "Quote操作に失敗しました。";
}

function logUnexpectedQuoteError(error: unknown): void {
  if (
    error instanceof Error &&
    ["FORBIDDEN", "QUOTE_NOT_FOUND", "INVALID_QUOTE_SOURCE"].includes(error.message)
  ) {
    return;
  }
  if (hasErrorCode(error, "P2002")) {
    return;
  }

  console.error("Failed to execute Quote command", error);
}

function hasErrorCode(error: unknown, code: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === code
  );
}

export const quoteCommand = createQuoteCommand(
  new QuoteService(new PrismaQuoteStore(prisma), new PrismaAuditLogStore(prisma))
);

export const quoteMonochromeMessageCommand = createQuoteMessageCommand(
  new QuoteService(new PrismaQuoteStore(prisma), new PrismaAuditLogStore(prisma)),
  "monochrome"
);

export const quoteColorMessageCommand = createQuoteMessageCommand(
  new QuoteService(new PrismaQuoteStore(prisma), new PrismaAuditLogStore(prisma)),
  "color"
);
