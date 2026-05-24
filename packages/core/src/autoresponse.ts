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

export const autoResponsePlugin: PluginMetadata = {
  id: AUTO_RESPONSE_PLUGIN_ID,
  name: "AutoResponse",
  version: "0.1.0",
  description: "キーワードに反応して返信する基本プラグイン。",
  configSchema: {
    type: "object",
    required: ["keyword", "response", "cooldownSeconds", "mentionAuthor"],
    additionalProperties: false,
    properties: {
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

export function autoResponseRuleId(guildId: string): string {
  return `${AUTO_RESPONSE_PLUGIN_ID}:${guildId}:default`;
}

export function buildAutoResponseRule(input: {
  readonly guildId: string;
  readonly config: AutoResponseConfig;
  readonly enabled: boolean;
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
    id: autoResponseRuleId(input.guildId),
    pluginId: AUTO_RESPONSE_PLUGIN_ID,
    name: "AutoResponse default rule",
    enabled: input.enabled,
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
