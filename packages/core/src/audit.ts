export type AuditSeverity = "info" | "warning" | "critical";

export interface AuditEventDefinition {
  readonly type: string;
  readonly label: string;
  readonly severity: AuditSeverity;
}

export interface AuditLogRecord {
  readonly id: string;
  readonly guildId: string;
  readonly pluginId: string;
  readonly type: string;
  readonly actorUserId: string;
  readonly targetId?: string;
  readonly data: Record<string, unknown>;
  readonly createdAt: Date;
}

export interface AuditLogQuery {
  readonly limit?: number;
  readonly pluginId?: string;
  readonly type?: string;
}

export interface AuditLogStore {
  append(record: Omit<AuditLogRecord, "id" | "createdAt">): Promise<AuditLogRecord>;
  listByGuild(guildId: string, query?: number | AuditLogQuery): Promise<AuditLogRecord[]>;
}

export class InMemoryAuditLogStore implements AuditLogStore {
  private readonly records: AuditLogRecord[] = [];

  async append(record: Omit<AuditLogRecord, "id" | "createdAt">): Promise<AuditLogRecord> {
    const next: AuditLogRecord = {
      ...record,
      id: crypto.randomUUID(),
      createdAt: new Date()
    };

    this.records.push(next);
    return next;
  }

  async listByGuild(
    guildId: string,
    query?: number | AuditLogQuery
  ): Promise<AuditLogRecord[]> {
    const options = typeof query === "number" ? { limit: query } : query;
    const records = this.records
      .filter(
        (record) =>
          record.guildId === guildId &&
          (!options?.pluginId || record.pluginId === options.pluginId) &&
          (!options?.type || record.type === options.type)
      )
      .reverse();
    return typeof options?.limit === "number" ? records.slice(0, options.limit) : records;
  }
}
