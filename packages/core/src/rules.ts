import type { AuditLogStore } from "./audit.js";

export interface MessageCreateEvent {
  readonly type: "messageCreate";
  readonly guildId: string;
  readonly channelId: string;
  readonly authorId: string;
  readonly authorRoleIds: readonly string[];
  readonly content: string;
  readonly isBot: boolean;
  readonly createdAt: Date;
}

export type RuleEvent = MessageCreateEvent;

export type RuleCondition =
  | {
      readonly type: "keyword";
      readonly value: string;
      readonly mode?: "contains" | "equals";
      readonly caseSensitive?: boolean;
    }
  | {
      readonly type: "regex";
      readonly pattern: string;
      readonly flags?: string;
    }
  | {
      readonly type: "channel";
      readonly channelIds: readonly string[];
    }
  | {
      readonly type: "role";
      readonly roleIds: readonly string[];
      readonly mode?: "any" | "all";
    };

export type RuleAction =
  | {
      readonly type: "reply";
      readonly content: string;
      readonly mentionAuthor?: boolean;
    }
  | {
      readonly type: "reaction";
      readonly emoji: string;
    }
  | {
      readonly type: "auditLog";
      readonly eventType: string;
      readonly data?: Record<string, unknown>;
    };

export interface RuleCooldown {
  readonly scope: "guild" | "channel" | "user";
  readonly seconds: number;
}

export interface RuleDefinition {
  readonly id: string;
  readonly pluginId: string;
  readonly name: string;
  readonly enabled: boolean;
  readonly trigger: RuleEvent["type"];
  readonly conditions: readonly RuleCondition[];
  readonly actions: readonly RuleAction[];
  readonly cooldown?: RuleCooldown;
  readonly preventBotLoop?: boolean;
}

export interface RuleEvaluationResult {
  readonly matchedRuleIds: readonly string[];
  readonly actions: readonly RuleAction[];
}

export interface RuleEngineOptions {
  readonly rules: readonly RuleDefinition[];
  readonly auditLogStore?: AuditLogStore;
  readonly now?: () => Date;
}

export class RuleEngine {
  private readonly cooldowns = new Map<string, Date>();
  private rules: readonly RuleDefinition[];
  private readonly auditLogStore: AuditLogStore | undefined;
  private readonly now: () => Date;

  constructor(options: RuleEngineOptions) {
    this.rules = options.rules;
    this.auditLogStore = options.auditLogStore;
    this.now = options.now ?? (() => new Date());
  }

  replaceRules(rules: readonly RuleDefinition[]): void {
    this.rules = rules;
  }

  async evaluate(event: RuleEvent): Promise<RuleEvaluationResult> {
    const matchedRuleIds: string[] = [];
    const actions: RuleAction[] = [];

    for (const rule of this.rules) {
      if (!this.canEvaluate(rule, event)) {
        continue;
      }

      if (!rule.conditions.every((condition) => this.matchesCondition(condition, event))) {
        continue;
      }

      if (this.isInCooldown(rule, event)) {
        continue;
      }

      this.markCooldown(rule, event);
      matchedRuleIds.push(rule.id);
      actions.push(...rule.actions);
      await this.writeAuditActions(rule, event);
    }

    return { matchedRuleIds, actions };
  }

  private canEvaluate(rule: RuleDefinition, event: RuleEvent): boolean {
    if (!rule.enabled || rule.trigger !== event.type) {
      return false;
    }

    if (event.type === "messageCreate" && event.isBot && rule.preventBotLoop !== false) {
      return false;
    }

    return true;
  }

  private matchesCondition(condition: RuleCondition, event: RuleEvent): boolean {
    switch (condition.type) {
      case "keyword":
        return this.matchesKeyword(condition, event.content);
      case "regex":
        return new RegExp(condition.pattern, condition.flags).test(event.content);
      case "channel":
        return condition.channelIds.includes(event.channelId);
      case "role": {
        const mode = condition.mode ?? "any";
        return mode === "all"
          ? condition.roleIds.every((roleId) => event.authorRoleIds.includes(roleId))
          : condition.roleIds.some((roleId) => event.authorRoleIds.includes(roleId));
      }
    }
  }

  private matchesKeyword(
    condition: Extract<RuleCondition, { type: "keyword" }>,
    content: string
  ): boolean {
    const mode = condition.mode ?? "contains";
    const haystack = condition.caseSensitive ? content : content.toLowerCase();
    const needle = condition.caseSensitive ? condition.value : condition.value.toLowerCase();

    return mode === "equals" ? haystack === needle : haystack.includes(needle);
  }

  private isInCooldown(rule: RuleDefinition, event: RuleEvent): boolean {
    if (!rule.cooldown) {
      return false;
    }

    const expiresAt = this.cooldowns.get(this.cooldownKey(rule, event));
    return expiresAt ? expiresAt > this.now() : false;
  }

  private markCooldown(rule: RuleDefinition, event: RuleEvent): void {
    if (!rule.cooldown) {
      return;
    }

    const expiresAt = new Date(this.now().getTime() + rule.cooldown.seconds * 1000);
    this.cooldowns.set(this.cooldownKey(rule, event), expiresAt);
  }

  private cooldownKey(rule: RuleDefinition, event: RuleEvent): string {
    if (!rule.cooldown) {
      return rule.id;
    }

    const scopedId =
      rule.cooldown.scope === "guild"
        ? event.guildId
        : rule.cooldown.scope === "channel"
          ? event.channelId
          : event.authorId;

    return `${rule.id}:${rule.cooldown.scope}:${scopedId}`;
  }

  private async writeAuditActions(rule: RuleDefinition, event: RuleEvent): Promise<void> {
    if (!this.auditLogStore) {
      return;
    }

    for (const action of rule.actions) {
      if (action.type !== "auditLog") {
        continue;
      }

      await this.auditLogStore.append({
        guildId: event.guildId,
        pluginId: rule.pluginId,
        type: action.eventType,
        actorUserId: event.authorId,
        targetId: event.channelId,
        data: action.data ?? {}
      });
    }
  }
}
