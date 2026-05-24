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

export interface AuditLogStore {
  append(record: Omit<AuditLogRecord, "id" | "createdAt">): Promise<AuditLogRecord>;
  listByGuild(guildId: string, limit?: number): Promise<AuditLogRecord[]>;
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

  async listByGuild(guildId: string, limit?: number): Promise<AuditLogRecord[]> {
    const records = this.records.filter((record) => record.guildId === guildId).reverse();
    return typeof limit === "number" ? records.slice(0, limit) : records;
  }
}
