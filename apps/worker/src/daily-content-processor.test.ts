import {
  DAILY_CONTENT_PROCESSING_STALE_AFTER_MS,
  InMemoryAuditLogStore,
  dailyContentDedupeKey,
  type DailyContentDeliveryClaim,
  type DailyContentDeliveryRecord,
  type DailyContentDeliveryStore,
  type DailyContentDueJob
} from "@lunaria/core";
import { describe, expect, it, vi } from "vitest";
import { DailyContentProcessor, DailyContentPublishError } from "./daily-content-processor.js";

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

  async claim(input: DailyContentDueJob, claimedAt = new Date()): Promise<DailyContentDeliveryClaim> {
    const key = dailyContentDedupeKey(input);
    const existing = this.records.get(key);

    if (existing?.status === "succeeded") {
      return { state: "already_succeeded", delivery: existing };
    }

    if (
      existing?.status === "processing" &&
      claimedAt.getTime() - existing.updatedAt.getTime() < DAILY_CONTENT_PROCESSING_STALE_AFTER_MS
    ) {
      return { state: "already_processing", delivery: existing };
    }

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
      createdAt: existing?.createdAt ?? claimedAt,
      updatedAt: claimedAt
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

  seed(record: DailyContentDeliveryRecord): void {
    this.records.set(record.dedupeKey, record);
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

    await expect(processor.process(job)).rejects.toThrow("PUBLISH_FAILED");
    const result = await processor.process(job);

    expect(result.state).toBe("published");
    expect(result.delivery.attemptCount).toBe(2);
    expect(publisher.publish).toHaveBeenCalledTimes(2);
    expect((await deliveries.listByGuild("guild-placeholder-a"))[0]?.failureCode).toBeUndefined();
    const records = await audits.listByGuild("guild-placeholder-a");
    expect(records.map((record) => record.type)).toEqual([
      "daily_content.delivery.succeeded",
      "daily_content.delivery.failed"
    ]);
  });

  it("stores and throws only sanitized failure codes when publisher errors contain sensitive text", async () => {
    const deliveries = new InMemoryDeliveryStore();
    const audits = new InMemoryAuditLogStore();
    const publisher = {
      publish: vi
        .fn()
        .mockRejectedValue(
          new Error("authorization=Bot test-token secret response body 今日の質問: {{question}}")
        )
    };
    const processor = new DailyContentProcessor(deliveries, publisher, audits);

    let caught: unknown;
    try {
      await processor.process(job);
    } catch (error) {
      caught = error;
    }

    const delivery = (await deliveries.listByGuild("guild-placeholder-a"))[0];
    const audit = (await audits.listByGuild("guild-placeholder-a"))[0];

    expect(caught).toBeInstanceOf(DailyContentPublishError);
    expect(String(caught)).toContain("PUBLISH_FAILED");
    expect(delivery?.status).toBe("retryable_failure");
    expect(delivery?.failureCode).toBe("PUBLISH_FAILED");
    expect(JSON.stringify(audit)).not.toContain("test-token");
    expect(JSON.stringify(audit)).not.toContain("authorization");
    expect(JSON.stringify(audit)).not.toContain("secret");
    expect(JSON.stringify(audit)).not.toContain("{{question}}");
    expect(JSON.stringify(caught)).not.toContain("test-token");
    expect(JSON.stringify(caught)).not.toContain("authorization");
    expect(JSON.stringify(caught)).not.toContain("secret");
    expect(JSON.stringify(caught)).not.toContain("{{question}}");
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

  it("recovers stale processing work once without changing its dedupe key", async () => {
    const deliveries = new InMemoryDeliveryStore();
    const staleAt = new Date("2026-05-28T00:00:00.000Z");
    const recoveryAt = new Date("2026-05-28T00:16:00.000Z");
    const dedupeKey = dailyContentDedupeKey(job);
    deliveries.seed({
      id: "delivery-stale",
      guildId: job.guildId,
      scheduleId: job.scheduleId,
      targetDate: job.targetDate,
      contentSlot: job.contentSlot,
      channelId: job.channelId,
      dedupeKey,
      status: "processing",
      attemptCount: 1,
      createdAt: staleAt,
      updatedAt: staleAt
    });
    const publisher = { publish: vi.fn().mockResolvedValue(undefined) };
    const processor = new DailyContentProcessor(
      deliveries,
      publisher,
      new InMemoryAuditLogStore(),
      () => recoveryAt
    );

    const recovered = await processor.process(job);
    const repeated = await processor.process(job);

    expect(recovered.state).toBe("published");
    expect(recovered.delivery.attemptCount).toBe(2);
    expect(recovered.delivery.dedupeKey).toBe(dedupeKey);
    expect(repeated.state).toBe("skipped");
    expect(publisher.publish).toHaveBeenCalledTimes(1);
  });
});
