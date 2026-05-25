import type { AuditLogQuery, AuditLogRecord, AuditLogStore } from "@lunaria/core";
import type { PrismaClient } from "@prisma/client";
import { ensureGuild } from "./guilds.js";
import { toInputJson, toJsonObject } from "./json.js";

export class PrismaAuditLogStore implements AuditLogStore {
  constructor(private readonly prisma: PrismaClient) {}

  async append(record: Omit<AuditLogRecord, "id" | "createdAt">): Promise<AuditLogRecord> {
    await ensureGuild(this.prisma, { id: record.guildId });

    const created = await this.prisma.auditLog.create({
      data: {
        guildId: record.guildId,
        pluginId: record.pluginId,
        type: record.type,
        actorUserId: record.actorUserId,
        ...(record.targetId ? { targetId: record.targetId } : {}),
        data: toInputJson(record.data)
      }
    });

    return this.toDomain(created);
  }

  async listByGuild(
    guildId: string,
    query?: number | AuditLogQuery
  ): Promise<AuditLogRecord[]> {
    const options = typeof query === "number" ? { limit: query } : query;
    const records = await this.prisma.auditLog.findMany({
      where: {
        guildId,
        ...(options?.pluginId ? { pluginId: options.pluginId } : {}),
        ...(options?.type ? { type: options.type } : {})
      },
      orderBy: { createdAt: "desc" },
      ...(typeof options?.limit === "number" ? { take: options.limit } : {})
    });

    return records.map((record) => this.toDomain(record));
  }

  private toDomain(record: {
    id: string;
    guildId: string;
    pluginId: string;
    type: string;
    actorUserId: string;
    targetId: string | null;
    data: unknown;
    createdAt: Date;
  }): AuditLogRecord {
    return {
      id: record.id,
      guildId: record.guildId,
      pluginId: record.pluginId,
      type: record.type,
      actorUserId: record.actorUserId,
      data: toJsonObject(record.data),
      createdAt: record.createdAt,
      ...(record.targetId ? { targetId: record.targetId } : {})
    };
  }
}
