import type { JsonObject, PluginMetadata } from "./plugins.js";
import type { RuleDefinition } from "./rules.js";

export const AUTO_RESPONSE_PLUGIN_ID = "autoresponse";

export interface AutoResponseConfig extends JsonObject {
  readonly keyword: string;
  readonly response: string;
  readonly channelId?: string;
  readonly cooldownSeconds: number;
  readonly mentionAuthor: boolean;
}

export interface AutoResponseRuleConfig extends AutoResponseConfig {
  readonly id: string;
  readonly enabled: boolean;
}

export interface AutoResponsePluginConfig extends JsonObject {
  readonly rules: readonly AutoResponseRuleConfig[];
}

export interface AutoResponseSettingsSnapshot {
  readonly enabled: boolean;
  readonly rules: readonly AutoResponseRuleConfig[];
}

export type AutoResponseRuleField =
  | "enabled"
  | "keyword"
  | "response"
  | "channelId"
  | "cooldownSeconds"
  | "mentionAuthor";

export interface AutoResponseRuleChange {
  readonly kind: "added" | "removed" | "updated";
  readonly ruleId: string;
  readonly fields: readonly AutoResponseRuleField[];
  readonly before?: AutoResponseRuleConfig;
  readonly after?: AutoResponseRuleConfig;
}

export interface AutoResponseConfigDiff extends JsonObject {
  readonly created: boolean;
  readonly enabled?: {
    readonly before: boolean | null;
    readonly after: boolean;
  };
  readonly ruleChanges: readonly AutoResponseRuleChange[];
}

export const autoResponsePlugin: PluginMetadata = {
  id: AUTO_RESPONSE_PLUGIN_ID,
  name: "AutoResponse",
  version: "0.1.0",
  description: "キーワードに反応して返信する基本プラグイン。",
  configSchema: {
    type: "object",
    required: ["rules"],
    additionalProperties: false,
    properties: {
      rules: {
        type: "array",
        maxItems: 25,
        items: {
          type: "object",
          required: [
            "id",
            "enabled",
            "keyword",
            "response",
            "cooldownSeconds",
            "mentionAuthor"
          ],
          additionalProperties: false,
          properties: {
            id: {
              type: "string",
              minLength: 1,
              maxLength: 120
            },
            enabled: {
              type: "boolean"
            },
            keyword: {
              type: "string",
              minLength: 1,
              maxLength: 80
            },
            response: {
              type: "string",
              minLength: 1,
              maxLength: 1800
            },
            channelId: {
              type: "string",
              minLength: 1,
              maxLength: 32
            },
            cooldownSeconds: {
              type: "integer",
              minimum: 0,
              maximum: 86400
            },
            mentionAuthor: {
              type: "boolean"
            }
          }
        }
      }
    }
  },
  permissions: [
    {
      permission: "autoresponse:manage",
      label: "AutoResponse管理",
      description: "AutoResponseの有効化、設定変更、ルール編集を行えます。"
    }
  ],
  auditEvents: [
    {
      type: "autoresponse.config.updated",
      label: "AutoResponse設定更新",
      severity: "info"
    },
    {
      type: "autoresponse.rule.matched",
      label: "AutoResponseルール発火",
      severity: "info"
    }
  ],
  pricing: {
    planKeys: ["free", "pro"],
    usageLimitKey: "autoresponse.rules"
  },
  dependencies: []
};

export function autoResponseRuleId(guildId: string, ruleId = "default"): string {
  return `${AUTO_RESPONSE_PLUGIN_ID}:${guildId}:${ruleId}`;
}

export function buildAutoResponseRule(input: {
  readonly guildId: string;
  readonly config: AutoResponseRuleConfig;
}): RuleDefinition {
  const conditions: RuleDefinition["conditions"] = [
    {
      type: "keyword",
      value: input.config.keyword,
      mode: "contains",
      caseSensitive: false
    },
    ...(input.config.channelId
      ? [
          {
            type: "channel" as const,
            channelIds: [input.config.channelId]
          }
        ]
      : [])
  ];

  return {
    id: autoResponseRuleId(input.guildId, input.config.id),
    pluginId: AUTO_RESPONSE_PLUGIN_ID,
    name: `AutoResponse: ${input.config.keyword}`,
    enabled: input.config.enabled,
    trigger: "messageCreate",
    conditions,
    actions: [
      {
        type: "reply",
        content: input.config.response,
        mentionAuthor: input.config.mentionAuthor
      },
      {
        type: "auditLog",
        eventType: "autoresponse.rule.matched",
        data: {
          keyword: input.config.keyword
        }
      }
    ],
    cooldown: {
      scope: "user",
      seconds: input.config.cooldownSeconds
    },
    preventBotLoop: true
  };
}

export function buildAutoResponseRules(input: {
  readonly guildId: string;
  readonly rules: readonly AutoResponseRuleConfig[];
}): RuleDefinition[] {
  return input.rules.map((rule) =>
    buildAutoResponseRule({
      guildId: input.guildId,
      config: rule
    })
  );
}

const autoResponseRuleFields: readonly AutoResponseRuleField[] = [
  "enabled",
  "keyword",
  "response",
  "channelId",
  "cooldownSeconds",
  "mentionAuthor"
];

export function diffAutoResponseConfig(
  before: AutoResponseSettingsSnapshot | undefined,
  after: AutoResponseSettingsSnapshot
): AutoResponseConfigDiff {
  const beforeRules = new Map(before?.rules.map((rule) => [rule.id, rule]));
  const afterRules = new Map(after.rules.map((rule) => [rule.id, rule]));
  const ruleChanges: AutoResponseRuleChange[] = [];

  for (const rule of after.rules) {
    const previousRule = beforeRules.get(rule.id);

    if (!previousRule) {
      ruleChanges.push({
        kind: "added",
        ruleId: rule.id,
        fields: autoResponseRuleFields,
        after: rule
      });
      continue;
    }

    const fields = autoResponseRuleFields.filter(
      (field) => previousRule[field] !== rule[field]
    );

    if (fields.length > 0) {
      ruleChanges.push({
        kind: "updated",
        ruleId: rule.id,
        fields,
        before: previousRule,
        after: rule
      });
    }
  }

  for (const rule of before?.rules ?? []) {
    if (!afterRules.has(rule.id)) {
      ruleChanges.push({
        kind: "removed",
        ruleId: rule.id,
        fields: autoResponseRuleFields,
        before: rule
      });
    }
  }

  return {
    created: before === undefined,
    ...(before === undefined || before.enabled !== after.enabled
      ? {
          enabled: {
            before: before?.enabled ?? null,
            after: after.enabled
          }
        }
      : {}),
    ruleChanges
  };
}

export function hasAutoResponseConfigChanges(diff: AutoResponseConfigDiff): boolean {
  return diff.created || Boolean(diff.enabled) || diff.ruleChanges.length > 0;
}

export function isAutoResponseConfig(value: unknown): value is AutoResponseConfig {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Partial<AutoResponseConfig>;
  return (
    typeof candidate.keyword === "string" &&
    typeof candidate.response === "string" &&
    typeof candidate.cooldownSeconds === "number" &&
    typeof candidate.mentionAuthor === "boolean" &&
    (candidate.channelId === undefined || typeof candidate.channelId === "string")
  );
}

export function isAutoResponseRuleConfig(value: unknown): value is AutoResponseRuleConfig {
  if (!isAutoResponseConfig(value)) {
    return false;
  }

  const candidate = value as Partial<AutoResponseRuleConfig>;
  return typeof candidate.id === "string" && typeof candidate.enabled === "boolean";
}

export function isAutoResponsePluginConfig(
  value: unknown
): value is AutoResponsePluginConfig {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Partial<AutoResponsePluginConfig>;
  return Array.isArray(candidate.rules) && candidate.rules.every(isAutoResponseRuleConfig);
}

export function autoResponseConfigFromRule(
  rule: RuleDefinition
): AutoResponseRuleConfig | undefined {
  const keywordCondition = rule.conditions.find(
    (condition) => condition.type === "keyword"
  );
  const channelCondition = rule.conditions.find(
    (condition) => condition.type === "channel"
  );
  const replyAction = rule.actions.find((action) => action.type === "reply");

  if (!keywordCondition || !replyAction) {
    return undefined;
  }

  const ruleId = rule.id.startsWith(`${AUTO_RESPONSE_PLUGIN_ID}:`)
    ? rule.id.split(":").at(-1) ?? rule.id
    : rule.id;

  return {
    id: ruleId,
    enabled: rule.enabled,
    keyword: keywordCondition.value,
    response: replyAction.content,
    cooldownSeconds: rule.cooldown?.seconds ?? 0,
    mentionAuthor: replyAction.mentionAuthor ?? false,
    ...(channelCondition?.channelIds[0]
      ? { channelId: channelCondition.channelIds[0] }
      : {})
  };
}
