import type { QuoteRecord, QuoteSource, QuoteStore } from "@lunaria/core";
import type { PrismaClient } from "@prisma/client";
import { ensureGuild } from "./guilds.js";

export class PrismaQuoteStore implements QuoteStore {
  constructor(private readonly prisma: PrismaClient) {}

  async create(
    input: QuoteSource & { readonly guildId: string; readonly registeredByUserId: string }
  ): Promise<QuoteRecord> {
    await ensureGuild(this.prisma, { id: input.guildId });

    const record = await this.prisma.quote.create({
      data: input
    });

    return this.toDomain(record);
  }

  async listVisibleByGuild(guildId: string, limit?: number): Promise<QuoteRecord[]> {
    const records = await this.prisma.quote.findMany({
      where: {
        guildId,
        hiddenAt: null
      },
      orderBy: { createdAt: "desc" },
      ...(typeof limit === "number" ? { take: limit } : {})
    });

    return records.map((record) => this.toDomain(record));
  }

  async hide(
    guildId: string,
    quoteId: string,
    actorUserId: string,
    hiddenAt: Date
  ): Promise<QuoteRecord | undefined> {
    const update = await this.prisma.quote.updateMany({
      where: {
        id: quoteId,
        guildId,
        hiddenAt: null
      },
      data: {
        hiddenAt,
        hiddenByUserId: actorUserId
      }
    });

    if (update.count === 0) {
      return undefined;
    }

    const record = await this.prisma.quote.findFirst({
      where: {
        id: quoteId,
        guildId
      }
    });

    return record ? this.toDomain(record) : undefined;
  }

  private toDomain(record: {
    id: string;
    guildId: string;
    content: string;
    sourceMessageId: string;
    sourceMessageUrl: string;
    sourceAuthorId: string;
    sourceAuthorName: string;
    sourceChannelId: string;
    sourceChannelName: string;
    sourceCreatedAt: Date;
    registeredByUserId: string;
    hiddenAt: Date | null;
    hiddenByUserId: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): QuoteRecord {
    return {
      id: record.id,
      guildId: record.guildId,
      content: record.content,
      sourceMessageId: record.sourceMessageId,
      sourceMessageUrl: record.sourceMessageUrl,
      sourceAuthorId: record.sourceAuthorId,
      sourceAuthorName: record.sourceAuthorName,
      sourceChannelId: record.sourceChannelId,
      sourceChannelName: record.sourceChannelName,
      sourceCreatedAt: record.sourceCreatedAt,
      registeredByUserId: record.registeredByUserId,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      ...(record.hiddenAt ? { hiddenAt: record.hiddenAt } : {}),
      ...(record.hiddenByUserId ? { hiddenByUserId: record.hiddenByUserId } : {})
    };
  }
}
