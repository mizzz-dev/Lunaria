import { RuleEngine, type MessageCreateEvent, type RuleAction } from "@lunaria/core";
import type { Message } from "discord.js";

const ruleEngine = new RuleEngine({ rules: [] });

export function getBotRuleEngine(): RuleEngine {
  return ruleEngine;
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

  const result = await ruleEngine.evaluate(event);

  for (const action of result.actions) {
    await executeRuleAction(message, action);
  }
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
