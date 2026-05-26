import type { AuditLogStore } from "./audit.js";
import type { JsonObject, PluginMetadata } from "./plugins.js";
import { hasPermission, type RbacActor } from "./rbac.js";

export const QUOTE_PLUGIN_ID = "quote";

export interface QuotePluginConfig extends JsonObject {
  readonly allowMemberSubmissions: false;
}

export interface QuoteSource {
  readonly content: string;
  readonly sourceMessageId: string;
  readonly sourceMessageUrl: string;
  readonly sourceAuthorId: string;
  readonly sourceAuthorName: string;
  readonly sourceChannelId: string;
  readonly sourceChannelName: string;
  readonly sourceCreatedAt: Date;
}

export interface QuoteRecord extends QuoteSource {
  readonly id: string;
  readonly guildId: string;
  readonly registeredByUserId: string;
  readonly hiddenAt?: Date;
  readonly hiddenByUserId?: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface QuoteStore {
  create(input: QuoteSource & { readonly guildId: string; readonly registeredByUserId: string }): Promise<QuoteRecord>;
  listVisibleByGuild(guildId: string, limit?: number): Promise<QuoteRecord[]>;
  hide(guildId: string, quoteId: string, actorUserId: string, hiddenAt: Date): Promise<QuoteRecord | undefined>;
}

export type DiscordMessageReference = {
  readonly guildId: string;
  readonly channelId: string;
  readonly messageId: string;
};

export const quotePlugin: PluginMetadata = {
  id: QUOTE_PLUGIN_ID,
  name: "Quote",
  version: "0.1.0",
  description: "Guildの発言を引用として保存し、再表示できるプラグイン。",
  configSchema: {
    type: "object",
    required: ["allowMemberSubmissions"],
    additionalProperties: false,
    properties: {
      allowMemberSubmissions: {
        const: false
      }
    }
  },
  permissions: [
    {
      permission: "quotes:create",
      label: "Quote登録",
      description: "Discordメッセージをquoteとして登録できます。"
    },
    {
      permission: "quotes:manage",
      label: "Quote管理",
      description: "保存済みquoteを非表示にできます。"
    }
  ],
  auditEvents: [
    {
      type: "quote.created",
      label: "Quote登録",
      severity: "info"
    },
    {
      type: "quote.hidden",
      label: "Quote非表示",
      severity: "warning"
    }
  ],
  pricing: {
    planKeys: ["free", "pro"],
    usageLimitKey: "quotes.monthly"
  },
  dependencies: []
};

export function isQuotePluginConfig(value: unknown): value is QuotePluginConfig {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  return (value as Partial<QuotePluginConfig>).allowMemberSubmissions === false;
}

export function parseDiscordMessageUrl(url: string): DiscordMessageReference | undefined {
  const match = /^https:\/\/(?:canary\.|ptb\.)?discord\.com\/channels\/([^/]+)\/([^/]+)\/([^/?#]+)(?:[/?#].*)?$/.exec(
    url
  );

  if (!match?.[1] || !match[2] || !match[3]) {
    return undefined;
  }

  return {
    guildId: match[1],
    channelId: match[2],
    messageId: match[3]
  };
}

export class InMemoryQuoteStore implements QuoteStore {
  private readonly records: QuoteRecord[] = [];

  async create(
    input: QuoteSource & { readonly guildId: string; readonly registeredByUserId: string }
  ): Promise<QuoteRecord> {
    const now = new Date();
    const record: QuoteRecord = {
      ...input,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now
    };
    this.records.push(record);
    return record;
  }

  async listVisibleByGuild(guildId: string, limit?: number): Promise<QuoteRecord[]> {
    const records = this.records
      .filter((quote) => quote.guildId === guildId && !quote.hiddenAt)
      .reverse();
    return typeof limit === "number" ? records.slice(0, limit) : records;
  }

  async hide(
    guildId: string,
    quoteId: string,
    actorUserId: string,
    hiddenAt: Date
  ): Promise<QuoteRecord | undefined> {
    const index = this.records.findIndex(
      (quote) => quote.id === quoteId && quote.guildId === guildId && !quote.hiddenAt
    );
    const record = this.records[index];

    if (index < 0 || !record) {
      return undefined;
    }

    const hidden = {
      ...record,
      hiddenAt,
      hiddenByUserId: actorUserId,
      updatedAt: hiddenAt
    };
    this.records[index] = hidden;
    return hidden;
  }
}

export class QuoteService {
  constructor(
    private readonly store: QuoteStore,
    private readonly auditLogStore: AuditLogStore,
    private readonly random = Math.random,
    private readonly now = () => new Date()
  ) {}

  async add(input: {
    readonly actor: RbacActor;
    readonly guildId: string;
    readonly quote: QuoteSource;
  }): Promise<QuoteRecord> {
    this.requirePermission(input.actor, input.guildId, "quotes:create");
    const messageReference = parseDiscordMessageUrl(input.quote.sourceMessageUrl);

    if (
      !messageReference ||
      messageReference.guildId !== input.guildId ||
      messageReference.channelId !== input.quote.sourceChannelId ||
      messageReference.messageId !== input.quote.sourceMessageId ||
      !input.quote.content.trim() ||
      input.quote.content.length > 2000
    ) {
      throw new Error("INVALID_QUOTE_SOURCE");
    }

    const quote = await this.store.create({
      ...input.quote,
      guildId: input.guildId,
      registeredByUserId: input.actor.userId
    });

    await this.auditLogStore.append({
      guildId: input.guildId,
      pluginId: QUOTE_PLUGIN_ID,
      type: "quote.created",
      actorUserId: input.actor.userId,
      targetId: quote.id,
      data: {
        sourceMessageId: quote.sourceMessageId,
        sourceChannelId: quote.sourceChannelId
      }
    });

    return quote;
  }

  async listVisible(guildId: string, limit?: number): Promise<QuoteRecord[]> {
    return this.store.listVisibleByGuild(guildId, limit);
  }

  async randomVisible(guildId: string): Promise<QuoteRecord | undefined> {
    const quotes = await this.store.listVisibleByGuild(guildId);
    if (quotes.length === 0) {
      return undefined;
    }

    const index = Math.min(Math.floor(this.random() * quotes.length), quotes.length - 1);
    return quotes[index];
  }

  async hide(input: {
    readonly actor: RbacActor;
    readonly guildId: string;
    readonly quoteId: string;
  }): Promise<QuoteRecord> {
    this.requirePermission(input.actor, input.guildId, "quotes:manage");

    const quote = await this.store.hide(
      input.guildId,
      input.quoteId,
      input.actor.userId,
      this.now()
    );

    if (!quote) {
      throw new Error("QUOTE_NOT_FOUND");
    }

    await this.auditLogStore.append({
      guildId: input.guildId,
      pluginId: QUOTE_PLUGIN_ID,
      type: "quote.hidden",
      actorUserId: input.actor.userId,
      targetId: quote.id,
      data: {
        sourceMessageId: quote.sourceMessageId
      }
    });

    return quote;
  }

  private requirePermission(actor: RbacActor, guildId: string, permission: string): void {
    if (actor.guildId !== guildId || !hasPermission(actor, permission)) {
      throw new Error("FORBIDDEN");
    }
  }
}
