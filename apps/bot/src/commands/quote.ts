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
  ChatInputCommandInteraction,
  ContextMenuCommandBuilder,
  EmbedBuilder,
  MessageContextMenuCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type Message
} from "discord.js";

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
      )
      .addSubcommand((subcommand) =>
        subcommand.setName("random").setDescription("Show a random quote")
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
          await interaction.reply({
            ...(quote
              ? { embeds: [quoteEmbed(quote)] }
              : { content: "表示できるquoteがまだありません。" }),
            allowedMentions: { parse: [] }
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
          await addQuoteFromMessage(service, interaction, guildId, actor, source);
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
        await interaction.reply({
          content: commandErrorMessage(error),
          ephemeral: true
        });
      }
    }
  };
}

export function createQuoteMessageCommand(service: QuoteCommandService) {
  return {
    data: new ContextMenuCommandBuilder()
      .setName("Quoteに登録")
      .setType(ApplicationCommandType.Message),

    async execute(interaction: MessageContextMenuCommandInteraction): Promise<void> {
      const guildId = interaction.guildId;
      if (!guildId) {
        await interaction.reply({ content: "Guildでのみ利用できます。", ephemeral: true });
        return;
      }

      try {
        await addQuoteFromMessage(
          service,
          interaction,
          guildId,
          quoteActor(interaction, guildId),
          interaction.targetMessage
        );
      } catch (error) {
        logUnexpectedQuoteError(error);
        await interaction.reply({
          content: commandErrorMessage(error),
          ephemeral: true
        });
      }
    }
  };
}

async function addQuoteFromMessage(
  service: QuoteCommandService,
  interaction: QuoteManagementInteraction,
  guildId: string,
  actor: RbacActor,
  source: Message
): Promise<void> {
  if (!hasPermission(actor, "quotes:create")) {
    throw new Error("FORBIDDEN");
  }

  const quote = await service.add({
    actor,
    guildId,
    quote: {
      content: source.content,
      sourceMessageId: source.id,
      sourceMessageUrl: source.url,
      sourceAuthorId: source.author.id,
      sourceAuthorName: source.author.globalName ?? source.author.username,
      sourceChannelId: source.channelId,
      sourceChannelName: channelName(source),
      sourceCreatedAt: source.createdAt
    }
  });

  await interaction.reply({
    content: `Quoteを登録しました: \`${quote.id}\``,
    ephemeral: true
  });
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

function quoteEmbed(quote: QuoteRecord): EmbedBuilder {
  return new EmbedBuilder()
    .setDescription(quote.content)
    .setAuthor({ name: quote.sourceAuthorName })
    .setFooter({ text: `#${quote.sourceChannelName}` })
    .setTimestamp(quote.sourceCreatedAt)
    .setURL(quote.sourceMessageUrl);
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

export const quoteMessageCommand = createQuoteMessageCommand(
  new QuoteService(new PrismaQuoteStore(prisma), new PrismaAuditLogStore(prisma))
);
