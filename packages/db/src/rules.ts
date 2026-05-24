import type { RuleDefinition, RuleEvent } from "@lunaria/core";
import { Prisma, type PrismaClient } from "@prisma/client";
import { ensureGuild } from "./guilds.js";
import { toInputJson } from "./json.js";

export interface RuleStore {
  listEnabledByGuild(guildId: string, trigger?: RuleEvent["type"]): Promise<RuleDefinition[]>;
  upsert(guildId: string, rule: RuleDefinition): Promise<RuleDefinition>;
}

export class PrismaRuleStore implements RuleStore {
  constructor(private readonly prisma: PrismaClient) {}

  async listEnabledByGuild(
    guildId: string,
    trigger?: RuleEvent["type"]
  ): Promise<RuleDefinition[]> {
    const records = await this.prisma.rule.findMany({
      where: {
        guildId,
        enabled: true,
        ...(trigger ? { trigger } : {})
      },
      orderBy: { createdAt: "asc" }
    });

    return records.map((record) => this.toDomain(record));
  }

  async upsert(guildId: string, rule: RuleDefinition): Promise<RuleDefinition> {
    await ensureGuild(this.prisma, { id: guildId });

    const record = await this.prisma.rule.upsert({
      where: { id: rule.id },
      create: {
        id: rule.id,
        guildId,
        pluginId: rule.pluginId,
        name: rule.name,
        enabled: rule.enabled,
        trigger: rule.trigger,
        conditions: toInputJson(rule.conditions),
        actions: toInputJson(rule.actions),
        cooldown: rule.cooldown ? toInputJson(rule.cooldown) : Prisma.JsonNull,
        preventBotLoop: rule.preventBotLoop ?? true
      },
      update: {
        pluginId: rule.pluginId,
        name: rule.name,
        enabled: rule.enabled,
        trigger: rule.trigger,
        conditions: toInputJson(rule.conditions),
        actions: toInputJson(rule.actions),
        cooldown: rule.cooldown ? toInputJson(rule.cooldown) : Prisma.JsonNull,
        preventBotLoop: rule.preventBotLoop ?? true
      }
    });

    return this.toDomain(record);
  }

  private toDomain(record: {
    id: string;
    pluginId: string;
    name: string;
    enabled: boolean;
    trigger: string;
    conditions: unknown;
    actions: unknown;
    cooldown: unknown;
    preventBotLoop: boolean;
  }): RuleDefinition {
    return {
      id: record.id,
      pluginId: record.pluginId,
      name: record.name,
      enabled: record.enabled,
      trigger: record.trigger as RuleEvent["type"],
      conditions: record.conditions as unknown as RuleDefinition["conditions"],
      actions: record.actions as unknown as RuleDefinition["actions"],
      preventBotLoop: record.preventBotLoop,
      ...(record.cooldown
        ? { cooldown: record.cooldown as NonNullable<RuleDefinition["cooldown"]> }
        : {})
    };
  }
}
