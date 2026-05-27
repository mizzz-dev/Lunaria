import {
  InMemoryAuditLogStore,
  dailyContentDedupeKey,
  type DailyContentDeliveryClaim,
  type DailyContentDeliveryRecord,
  type DailyContentDeliveryStore,
  type DailyContentDueJob
} from "@lunaria/core";
import { describe, expect, it, vi } from "vitest";
import { DailyContentProcessor } from "./daily-content-processor.js";

const job: DailyContentDueJob = {
  guildId: "guild-placeholder-a",
  scheduleId: "daily-morning",
  targetDate: "2026-05-28",
  channelId: "channel-placeholder-1",
  contentSlot: "question",
  template: "今日の質問: {{question}}"
};

class InMemoryDeliveryStore implements DailyContentDeliveryStore {
  private readonly records = new Map<string, DailyContentDeliveryRecord>();

  async claim(input: DailyContentDueJob): Promise<DailyContentDeliveryClaim> {
    const key = dailyContentDedupeKey(input);
    const existing = this.records.get(key);

    if (existing?.status === "succeeded") {
      return { state: "already_succeeded", delivery: existing };
    }

    if (existing?.status === "processing") {
      return { state: "already_processing", delivery: existing };
    }

    const now = new Date("2026-05-28T00:00:00.000Z");
    const delivery: DailyContentDeliveryRecord = {
      id: existing?.id ?? `delivery-${this.records.size + 1}`,
      guildId: input.guildId,
      scheduleId: input.scheduleId,
      targetDate: input.targetDate,
      contentSlot: input.contentSlot,
      channelId: input.channelId,
      dedupeKey: key,
      status: "processing",
      attemptCount: (existing?.attemptCount ?? 0) + 1,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now
    };
    this.records.set(key, delivery);
    return { state: "claimed", delivery };
  }

  async succeed(
    guildId: string,
    dedupeKey: string,
    publishedAt: Date
  ): Promise<DailyContentDeliveryRecord> {
    return this.update(guildId, dedupeKey, {
      status: "succeeded",
      publishedAt
    });
  }

  async fail(
    guildId: string,
    dedupeKey: string,
    failureCode: string
  ): Promise<DailyContentDeliveryRecord> {
    return this.update(guildId, dedupeKey, {
      status: "retryable_failure",
      failureCode
    });
  }

  async listByGuild(guildId: string): Promise<DailyContentDeliveryRecord[]> {
    return [...this.records.values()].filter((record) => record.guildId === guildId);
  }

  private update(
    guildId: string,
    dedupeKey: string,
    values: Pick<DailyContentDeliveryRecord, "status"> & {
      readonly publishedAt?: Date;
      readonly failureCode?: string;
    }
  ): DailyContentDeliveryRecord {
    const current = this.records.get(dedupeKey);

    if (!current || current.guildId !== guildId) {
      throw new Error("DELIVERY_NOT_FOUND");
    }

    const next: DailyContentDeliveryRecord = {
      ...current,
      ...values,
      updatedAt: new Date("2026-05-28T00:01:00.000Z")
    };
    this.records.set(dedupeKey, next);
    return next;
  }
}

describe("DailyContentProcessor", () => {
  it("publishes a due job once and audits the successful result", async () => {
    const deliveries = new InMemoryDeliveryStore();
    const audits = new InMemoryAuditLogStore();
    const publisher = { publish: vi.fn().mockResolvedValue(undefined) };
    const processor = new DailyContentProcessor(deliveries, publisher, audits);

    const first = await processor.process(job);
    const duplicate = await processor.process(job);

    expect(first.state).toBe("published");
    expect(duplicate.state).toBe("skipped");
    expect(publisher.publish).toHaveBeenCalledTimes(1);
    expect(publisher.publish).toHaveBeenCalledWith({
      ...job,
      dedupeKey: "daily-content:guild-placeholder-a:daily-morning:2026-05-28:question"
    });
    const records = await audits.listByGuild("guild-placeholder-a");
    expect(records).toHaveLength(1);
    expect(records[0]?.type).toBe("daily_content.delivery.succeeded");
    expect(records[0]?.data).not.toHaveProperty("template");
  });

  it("records a retryable failure and publishes on the next attempt", async () => {
    const deliveries = new InMemoryDeliveryStore();
    const audits = new InMemoryAuditLogStore();
    const publisher = {
      publish: vi.fn().mockRejectedValueOnce(new Error("transport failure")).mockResolvedValue(undefined)
    };
    const processor = new DailyContentProcessor(deliveries, publisher, audits);

    await expect(processor.process(job)).rejects.toThrow("transport failure");
    const result = await processor.process(job);

    expect(result.state).toBe("published");
    expect(result.delivery.attemptCount).toBe(2);
    expect(publisher.publish).toHaveBeenCalledTimes(2);
    const records = await audits.listByGuild("guild-placeholder-a");
    expect(records.map((record) => record.type)).toEqual([
      "daily_content.delivery.succeeded",
      "daily_content.delivery.failed"
    ]);
  });

  it("keeps delivery and audit queries separated by guild", async () => {
    const deliveries = new InMemoryDeliveryStore();
    const audits = new InMemoryAuditLogStore();
    const processor = new DailyContentProcessor(
      deliveries,
      { publish: vi.fn().mockResolvedValue(undefined) },
      audits
    );

    await processor.process(job);
    await processor.process({ ...job, guildId: "guild-placeholder-b" });

    expect(await deliveries.listByGuild("guild-placeholder-a")).toHaveLength(1);
    expect(await deliveries.listByGuild("guild-placeholder-b")).toHaveLength(1);
    expect(await audits.listByGuild("guild-placeholder-a")).toHaveLength(1);
    expect(await audits.listByGuild("guild-placeholder-b")).toHaveLength(1);
  });
});
