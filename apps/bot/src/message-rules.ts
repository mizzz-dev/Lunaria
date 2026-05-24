import { RuleEngine, type MessageCreateEvent, type RuleAction } from "@lunaria/core";
import {
  prisma,
  PrismaAuditLogStore,
  PrismaRuleStore,
  type RuleStore
} from "@lunaria/db";
import type { Message } from "discord.js";

type GuildRuleRuntime = {
  readonly engine: RuleEngine;
  expiresAt: number;
};

const ruleStore: RuleStore = new PrismaRuleStore(prisma);
const auditLogStore = new PrismaAuditLogStore(prisma);
const guildRuntimes = new Map<string, GuildRuleRuntime>();
const ruleCacheTtlMs = 30_000;

export function getBotRuleEngine(guildId: string): RuleEngine | undefined {
  return guildRuntimes.get(guildId)?.engine;
}

export function toMessageCreateEvent(message: Message): MessageCreateEvent | undefined {
  if (!message.guildId || !message.guild) {
    return undefined;
  }

  return {
    type: "messageCreate",
    guildId: message.guildId,
    channelId: message.channelId,
    authorId: message.author.id,
    authorRoleIds: message.member ? [...message.member.roles.cache.keys()] : [],
    content: message.content ?? "",
    isBot: message.author.bot,
    createdAt: message.createdAt
  };
}

export async function handleMessageCreate(message: Message): Promise<void> {
  const event = toMessageCreateEvent(message);

  if (!event) {
    return;
  }

  const runtime = await getGuildRuleRuntime(event.guildId);
  const result = await runtime.engine.evaluate(event);

  for (const action of result.actions) {
    await executeRuleAction(message, action);
  }
}

async function getGuildRuleRuntime(guildId: string): Promise<GuildRuleRuntime> {
  const now = Date.now();
  const current = guildRuntimes.get(guildId);

  if (current && current.expiresAt > now) {
    return current;
  }

  const rules = await ruleStore.listEnabledByGuild(guildId, "messageCreate");

  if (current) {
    current.engine.replaceRules(rules);
    current.expiresAt = now + ruleCacheTtlMs;
    return current;
  }

  const runtime: GuildRuleRuntime = {
    engine: new RuleEngine({
      rules,
      auditLogStore
    }),
    expiresAt: now + ruleCacheTtlMs
  };

  guildRuntimes.set(guildId, runtime);
  return runtime;
}

async function executeRuleAction(message: Message, action: RuleAction): Promise<void> {
  switch (action.type) {
    case "reply":
      await message.reply({
        content: action.content,
        allowedMentions: { repliedUser: action.mentionAuthor ?? false }
      });
      break;
    case "reaction":
      await message.react(action.emoji);
      break;
    case "auditLog":
      break;
  }
}
