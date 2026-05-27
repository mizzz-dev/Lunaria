import {
  QuoteService,
  hasPermission,
  parseDiscordMessageUrl,
  type QuoteRecord,
  type RbacActor
} from "@lunaria/core";
import { prisma, PrismaAuditLogStore, PrismaQuoteStore } from "@lunaria/db";
import {
  ActionRowBuilder,
  ApplicationCommandType,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ChatInputCommandInteraction,
  ContextMenuCommandBuilder,
  MessageFlags,
  MessageContextMenuCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type Client,
  type Message
} from "discord.js";
import {
  renderQuoteCard,
  type QuoteCardAppearance,
  type QuoteCardAvatarPosition,
  type QuoteCardDesign,
  type QuoteCardTheme
} from "../quote-card.js";

type QuoteCommandService = Pick<QuoteService, "add" | "hide" | "randomVisible">;
type QuoteManagementInteraction =
  | ChatInputCommandInteraction
  | MessageContextMenuCommandInteraction
  | ButtonInteraction;

const defaultAppearance: QuoteCardAppearance = {
  theme: "color",
  avatarPosition: "left",
  design: "anime"
};
const quoteCardButtonPrefix = "quote-card";

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
          .addStringOption((option) => designOption(option))
          .addStringOption((option) => themeOption(option))
          .addStringOption((option) => avatarPositionOption(option))
      )
      .addSubcommand((subcommand) =>
        subcommand
          .setName("random")
          .setDescription("Show a random quote")
          .addStringOption((option) => designOption(option))
          .addStringOption((option) => themeOption(option))
          .addStringOption((option) => avatarPositionOption(option))
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
        await interaction.reply({
          content: "Guildでのみ利用できます。",
          flags: MessageFlags.Ephemeral
        });
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
          const appearance = selectedAppearance(interaction);
          await interaction.editReply({
            files: [await quoteImageAttachment(quote, avatarUrl, appearance)],
            components: quoteCardControls(
              { channelId: quote.sourceChannelId, id: quote.sourceMessageId },
              appearance
            )
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
          const appearance = selectedAppearance(interaction);
          await interaction.deferReply();
          await interaction.editReply({
            files: [
              await createQuoteImageFromMessage(service, guildId, actor, source, appearance)
            ],
            components: quoteCardControls(source, appearance)
          });
          return;
        }

        if (subcommand === "hide") {
          await service.hide({
            actor,
            guildId,
            quoteId: interaction.options.getString("quote-id", true)
          });
          await interaction.reply({
            content: "Quoteを非表示にしました。",
            flags: MessageFlags.Ephemeral
          });
          return;
        }

        await interaction.reply({
          content: "未知のquote操作です。",
          flags: MessageFlags.Ephemeral
        });
      } catch (error) {
        logUnexpectedQuoteError(error);
        await replyWithError(interaction, error);
      }
    }
  };
}

export function createQuoteMessageCommand(service: QuoteCommandService) {
  return {
    data: new ContextMenuCommandBuilder()
      .setName("Quote画像を作成")
      .setType(ApplicationCommandType.Message),

    async execute(interaction: MessageContextMenuCommandInteraction): Promise<void> {
      const guildId = interaction.guildId;
      if (!guildId) {
        await interaction.reply({
          content: "Guildでのみ利用できます。",
          flags: MessageFlags.Ephemeral
        });
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
              defaultAppearance
            )
          ],
          components: quoteCardControls(interaction.targetMessage, defaultAppearance)
        });
      } catch (error) {
        logUnexpectedQuoteError(error);
        await replyWithError(interaction, error);
      }
    }
  };
}

export async function handleQuoteCardButtonInteraction(
  interaction: ButtonInteraction,
  service: QuoteCommandService = quoteService()
): Promise<boolean> {
  const selected = parseQuoteCardButtonId(interaction.customId);
  if (!selected) {
    return false;
  }

  const guildId = interaction.guildId;
  if (!guildId) {
    await interaction.reply({
      content: "Guildでのみ利用できます。",
      flags: MessageFlags.Ephemeral
    });
    return true;
  }

  const actor = quoteActor(interaction, guildId);
  if (!hasPermission(actor, "quotes:create")) {
    await interaction.reply({
      content: "このquote操作を行う権限がありません。",
      flags: MessageFlags.Ephemeral
    });
    return true;
  }

  try {
    await interaction.deferUpdate();
    const source = await fetchQuoteMessageById(
      interaction.client,
      selected.channelId,
      selected.messageId,
      guildId
    );
    await interaction.editReply({
      files: [
        await createQuoteImageFromMessage(
          service,
          guildId,
          actor,
          source,
          selected.appearance
        )
      ],
      components: quoteCardControls(source, selected.appearance)
    });
  } catch (error) {
    logUnexpectedQuoteError(error);
    const content = commandErrorMessage(error);
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp({ content, flags: MessageFlags.Ephemeral });
    } else {
      await interaction.reply({ content, flags: MessageFlags.Ephemeral });
    }
  }

  return true;
}

async function createQuoteImageFromMessage(
  service: QuoteCommandService,
  guildId: string,
  actor: RbacActor,
  source: Message,
  appearance: QuoteCardAppearance
): Promise<AttachmentBuilder> {
  if (!hasPermission(actor, "quotes:create")) {
    throw new Error("FORBIDDEN");
  }

  const quote = {
    content: sourceQuoteContent(source),
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
    sourcePortraitUrl(source),
    appearance
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

  return fetchQuoteMessageById(
    interaction.client,
    reference.channelId,
    reference.messageId,
    guildId
  );
}

async function fetchQuoteMessageById(
  client: Client,
  channelId: string,
  messageId: string,
  guildId: string
): Promise<Message> {
  const channel = await client.channels.fetch(channelId);
  if (!channel?.isTextBased() || !("messages" in channel)) {
    throw new Error("INVALID_QUOTE_SOURCE");
  }

  const message = await channel.messages.fetch(messageId);
  if (message.guildId !== guildId || !hasRenderableSource(message)) {
    throw new Error("INVALID_QUOTE_SOURCE");
  }

  return message;
}

function channelName(message: Message): string {
  return "name" in message.channel && message.channel.name
    ? message.channel.name
    : message.channelId;
}

function hasRenderableSource(message: Message): boolean {
  return Boolean(message.content.trim() || sourceImageAttachment(message));
}

function sourceQuoteContent(message: Message): string {
  if (message.content.trim()) {
    return message.content;
  }

  const image = sourceImageAttachment(message);
  if (!image) {
    throw new Error("INVALID_QUOTE_SOURCE");
  }

  return image.description?.trim() || image.name || "画像付きメッセージ";
}

function sourceImageAttachment(message: Message) {
  return message.attachments?.find((attachment) => attachment.contentType?.startsWith("image/"));
}

function sourcePortraitUrl(message: Message): string {
  return (
    sourceImageAttachment(message)?.url ??
    message.author.displayAvatarURL({ extension: "png", size: 512 })
  );
}

function designOption<T extends { setName(name: string): T; setDescription(description: string): T; addChoices(...choices: { name: string; value: string }[]): T }>(
  option: T
): T {
  return option
    .setName("design")
    .setDescription("Quote画像のデザイン")
    .addChoices(
      { name: "アニメポスター", value: "anime" },
      { name: "漫画コマ", value: "manga" },
      { name: "ネオン配信", value: "neon" },
      { name: "シネマ", value: "cinema" }
    );
}

function themeOption<T extends { setName(name: string): T; setDescription(description: string): T; addChoices(...choices: { name: string; value: string }[]): T }>(
  option: T
): T {
  return option
    .setName("theme")
    .setDescription("Quote画像のテーマ")
    .addChoices(
      { name: "背景黒", value: "black" },
      { name: "背景白", value: "white" },
      { name: "カラー", value: "color" }
    );
}

function avatarPositionOption<T extends { setName(name: string): T; setDescription(description: string): T; addChoices(...choices: { name: string; value: string }[]): T }>(
  option: T
): T {
  return option
    .setName("icon-position")
    .setDescription("アイコン画像の位置")
    .addChoices({ name: "左", value: "left" }, { name: "右", value: "right" });
}

function selectedAppearance(interaction: ChatInputCommandInteraction): QuoteCardAppearance {
  return {
    design: parseDesign(interaction.options.getString("design")) ?? defaultAppearance.design,
    theme: parseTheme(interaction.options.getString("theme")) ?? defaultAppearance.theme,
    avatarPosition:
      parseAvatarPosition(interaction.options.getString("icon-position")) ??
      defaultAppearance.avatarPosition
  };
}

async function quoteImageAttachment(
  quote: Pick<QuoteRecord, "content" | "sourceAuthorName" | "sourceChannelName" | "sourceCreatedAt">,
  avatarUrl: string | undefined,
  appearance: QuoteCardAppearance
): Promise<AttachmentBuilder> {
  const image = await renderQuoteCard({
    quote,
    appearance,
    ...(avatarUrl ? { portraitUrl: avatarUrl } : {})
  });
  return new AttachmentBuilder(image, {
    name: `lunaria-quote-${appearance.theme}-${appearance.avatarPosition}.png`
  });
}

function quoteCardControls(
  source: Pick<Message, "channelId" | "id">,
  appearance: QuoteCardAppearance
): ActionRowBuilder<ButtonBuilder>[] {
  const themeRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    ...([
      ["black", "背景黒"],
      ["white", "背景白"],
      ["color", "カラー"]
    ] as const).map(([theme, label]) =>
      new ButtonBuilder()
        .setCustomId(buttonId(source, { ...appearance, theme }, "theme"))
        .setLabel(label)
        .setStyle(theme === appearance.theme ? ButtonStyle.Primary : ButtonStyle.Secondary)
    )
  );
  const designRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    ...([
      ["anime", "アニメ"],
      ["manga", "漫画"],
      ["neon", "ネオン"],
      ["cinema", "シネマ"]
    ] as const).map(([design, label]) =>
      new ButtonBuilder()
        .setCustomId(buttonId(source, { ...appearance, design }, "design"))
        .setLabel(label)
        .setStyle(design === appearance.design ? ButtonStyle.Primary : ButtonStyle.Secondary)
    )
  );
  const sideRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    ...([
      ["left", "アイコン 左"],
      ["right", "アイコン 右"]
    ] as const).map(([avatarPosition, label]) =>
      new ButtonBuilder()
        .setCustomId(buttonId(source, { ...appearance, avatarPosition }, "position"))
        .setLabel(label)
        .setStyle(
          avatarPosition === appearance.avatarPosition
            ? ButtonStyle.Primary
            : ButtonStyle.Secondary
        )
    )
  );

  return [designRow, themeRow, sideRow];
}

function buttonId(
  source: Pick<Message, "channelId" | "id">,
  appearance: QuoteCardAppearance,
  control: "design" | "theme" | "position"
): string {
  return [
    quoteCardButtonPrefix,
    source.channelId,
    source.id,
    appearance.design,
    appearance.theme,
    appearance.avatarPosition,
    control
  ].join(":");
}

function parseQuoteCardButtonId(customId: string): {
  readonly channelId: string;
  readonly messageId: string;
  readonly appearance: QuoteCardAppearance;
} | undefined {
  const parts = customId.split(":");
  const [prefix, channelId, messageId] = parts;
  const [designValue, themeValue, positionValue] =
    parts.length === 5 ? ["cinema", parts[3], parts[4]] : parts.slice(3);
  const design = parseDesign(designValue);
  const theme = parseTheme(themeValue);
  const avatarPosition = parseAvatarPosition(positionValue);
  if (
    prefix !== quoteCardButtonPrefix ||
    !channelId ||
    !messageId ||
    !design ||
    !theme ||
    !avatarPosition
  ) {
    return undefined;
  }

  return { channelId, messageId, appearance: { design, theme, avatarPosition } };
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
  interaction: ChatInputCommandInteraction | MessageContextMenuCommandInteraction,
  error: unknown
): Promise<void> {
  const content = commandErrorMessage(error);
  if (interaction.deferred || interaction.replied) {
    await interaction.editReply({ content, components: [] });
    return;
  }

  await interaction.reply({ content, flags: MessageFlags.Ephemeral });
}

export async function handleQuoteReplyMessage(
  message: Message,
  service: QuoteCommandService = quoteService()
): Promise<boolean> {
  if (!message.guildId || message.author.bot) {
    return false;
  }

  const parsed = parseReplyCommand(message.content);
  if (!parsed) {
    return false;
  }

  if (!parsed.appearance || !message.reference?.messageId) {
    await message.reply({
      content: replyUsage(parsed.error),
      allowedMentions: { repliedUser: false }
    });
    return true;
  }

  try {
    const source = await message.fetchReference();
    const file = await createQuoteImageFromMessage(
      service,
      message.guildId,
      quoteMessageActor(message, message.guildId),
      source,
      parsed.appearance
    );
    await message.reply({
      files: [file],
      components: quoteCardControls(source, parsed.appearance),
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

function parseReplyCommand(content: string): {
  readonly appearance?: QuoteCardAppearance;
  readonly error?: string;
} | undefined {
  const match = /^(?:!quote|!q)(?:\s+(.*))?$/iu.exec(content.trim());
  if (!match) {
    return undefined;
  }

  let theme = defaultAppearance.theme;
  let avatarPosition = defaultAppearance.avatarPosition;
  let design = defaultAppearance.design;
  const argumentsText = match[1]?.trim();
  if (!argumentsText) {
    return { appearance: { design, theme, avatarPosition } };
  }

  for (const token of argumentsText.split(/\s+/u)) {
    const nextTheme = parseTheme(token);
    const nextPosition = parseAvatarPosition(token);
    const nextDesign = parseDesign(token);
    if (nextDesign) {
      design = nextDesign;
    } else if (nextTheme) {
      theme = nextTheme;
    } else if (nextPosition) {
      avatarPosition = nextPosition;
    } else {
      return { error: `不明な指定: ${token}` };
    }
  }

  return { appearance: { design, theme, avatarPosition } };
}

function parseDesign(value: string | undefined | null): QuoteCardDesign | undefined {
  if (value && ["anime", "アニメ", "アニメポスター"].includes(value)) {
    return "anime";
  }
  if (value && ["manga", "漫画", "漫画コマ"].includes(value)) {
    return "manga";
  }
  if (value && ["neon", "ネオン", "配信", "ネオン配信"].includes(value)) {
    return "neon";
  }
  if (value && ["cinema", "シネマ", "映画"].includes(value)) {
    return "cinema";
  }
  return undefined;
}

function parseTheme(value: string | undefined | null): QuoteCardTheme | undefined {
  if (value && ["color", "カラー"].includes(value)) {
    return "color";
  }
  if (value && ["black", "dark", "黒", "背景黒", "monochrome", "mono", "bw", "白黒"].includes(value)) {
    return "black";
  }
  if (value && ["white", "light", "白", "背景白"].includes(value)) {
    return "white";
  }
  return undefined;
}

function parseAvatarPosition(
  value: string | undefined | null
): QuoteCardAvatarPosition | undefined {
  if (value && ["left", "l", "左"].includes(value)) {
    return "left";
  }
  if (value && ["right", "r", "右"].includes(value)) {
    return "right";
  }
  return undefined;
}

function replyUsage(error?: string): string {
  const prefix = error ? `${error}\n` : "";
  return `${prefix}画像化したいメッセージへ返信して \`!quote\` を送ってください。\n例: \`!quote アニメ カラー 右\`, \`!q 漫画 白 左\`, \`!quote ネオン 黒\``;
}

function commandErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message === "FORBIDDEN") {
    return "このquote操作を行う権限がありません。";
  }
  if (error instanceof Error && error.message === "QUOTE_NOT_FOUND") {
    return "対象のquoteが見つかりません。";
  }
  if (error instanceof Error && error.message === "INVALID_QUOTE_SOURCE") {
    return "同じGuildの本文または画像付きメッセージを指定してください。";
  }
  if (hasErrorCode(error, "P2002")) {
    return "このメッセージは既にQuoteへ登録されています。";
  }
  return "Quote画像の生成に失敗しました。もう一度試してください。";
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

function quoteService(): QuoteService {
  return new QuoteService(new PrismaQuoteStore(prisma), new PrismaAuditLogStore(prisma));
}

export const quoteCommand = createQuoteCommand(quoteService());
export const quoteMessageCommand = createQuoteMessageCommand(quoteService());
