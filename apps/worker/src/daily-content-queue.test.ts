import {
  DAILY_CONTENT_PLUGIN_ID,
  DAILY_CONTENT_PROCESSING_STALE_AFTER_MS,
  InMemoryAuditLogStore,
  InMemoryGuildPluginSettingsStore,
  dailyContentDedupeKey,
  type DailyContentDeliveryClaim,
  type DailyContentDeliveryRecord,
  type DailyContentDeliveryStore,
  type DailyContentDueJob
} from "@lunaria/core";
import { describe, expect, it, vi } from "vitest";
import { DailyContentOrchestrator } from "./daily-content-orchestrator.js";
import { DailyContentProcessor } from "./daily-content-processor.js";
import {
  DAILY_CONTENT_PROCESS_DUE_GUILD_JOB,
  DailyContentQueueProducer,
  DailyContentQueueWorkerProcessor,
  buildDailyContentQueueJobId,
  parseDailyContentQueuePayload,
  type DailyContentQueueLike
} from "./daily-content-queue.js";

const config = {
  schedules: [
    {
      id: "daily-morning",
      channelId: "channel-placeholder-1",
      timezone: "Asia/Tokyo",
      postingTime: "08:30",
      content: [{ slot: "question" as const, template: "今日の質問: {{question}}" }]
    }
  ]
};

const dueJob: DailyContentDueJob = {
  guildId: "guild-placeholder-a",
  scheduleId: "daily-morning",
  targetDate: "2026-05-28",
  channelId: "channel-placeholder-1",
  contentSlot: "question",
  template: "今日の質問: {{question}}"
};

class FakeQueue implements DailyContentQueueLike {
  readonly add = vi.fn<DailyContentQueueLike["add"]>().mockResolvedValue({ id: "job-placeholder" });
}

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
      ...values
    };
    this.records.set(dedupeKey, next);
    return next;
  }
}

async function enableDailyContent(
  settings: InMemoryGuildPluginSettingsStore,
  guildId = "guild-placeholder-a"
): Promise<void> {
  await settings.set({
    guildId,
    pluginId: DAILY_CONTENT_PLUGIN_ID,
    enabled: true,
    config,
    updatedByUserId: "user-placeholder-admin",
    updatedAt: new Date("2026-05-27T00:00:00.000Z")
  });
}

describe("DailyContentQueueProducer", () => {
  it("enqueues a validated guild-scoped due scan payload without template content", async () => {
    const queue = new FakeQueue();
    const producer = new DailyContentQueueProducer(
      queue,
      () => new Date("2026-05-27T23:30:00.000Z")
    );

    await producer.enqueueDueGuild({
      guildId: "guild-placeholder-a",
      referenceTime: new Date("2026-05-27T23:30:00.000Z")
    });

    expect(queue.add).toHaveBeenCalledWith(
      DAILY_CONTENT_PROCESS_DUE_GUILD_JOB,
      {
        guildId: "guild-placeholder-a",
        enqueuedAt: "2026-05-27T23:30:00.000Z",
        referenceTime: "2026-05-27T23:30:00.000Z"
      },
      expect.objectContaining({
        jobId: "daily-content:due-guild:guild-placeholder-a:2026-05-27T23%3A30%3A00.000Z",
        attempts: 3
      })
    );
    expect(JSON.stringify(queue.add.mock.calls[0]?.[1])).not.toContain("{{question}}");
  });
});

describe("DailyContentQueueWorkerProcessor", () => {
  it("rejects invalid payloads before orchestration", async () => {
    const orchestrator = { processDueForGuild: vi.fn() };
    const processor = new DailyContentQueueWorkerProcessor(orchestrator);

    await expect(processor.process({ guildId: "" })).rejects.toThrow(
      "DAILY_CONTENT_QUEUE_PAYLOAD_INVALID"
    );
    expect(orchestrator.processDueForGuild).not.toHaveBeenCalled();
  });

  it("dispatches a guild due scan using the payload reference time and returns a safe summary", async () => {
    const orchestrator = {
      processDueForGuild: vi.fn().mockResolvedValue({
        jobs: [dueJob],
        results: [
          {
            state: "skipped",
            reason: "already_succeeded",
            delivery: {} as DailyContentDeliveryRecord
          }
        ]
      })
    };
    const processor = new DailyContentQueueWorkerProcessor(
      orchestrator,
      () => new Date("2026-05-27T23:31:00.000Z")
    );

    const result = await processor.process({
      guildId: "guild-placeholder-a",
      enqueuedAt: "2026-05-27T23:29:00.000Z",
      referenceTime: "2026-05-27T23:30:00.000Z"
    });

    expect(orchestrator.processDueForGuild).toHaveBeenCalledWith(
      "guild-placeholder-a",
      new Date("2026-05-27T23:30:00.000Z")
    );
    expect(result).toEqual({
      guildId: "guild-placeholder-a",
      dueJobCount: 1,
      publishedCount: 0,
      skippedCount: 1,
      alreadySucceededCount: 1,
      alreadyProcessingCount: 0,
      processedAt: "2026-05-27T23:31:00.000Z"
    });
    expect(JSON.stringify(result)).not.toContain("{{question}}");
  });

  it("sanitizes orchestration failures before BullMQ stores the failed reason", async () => {
    const processor = new DailyContentQueueWorkerProcessor({
      processDueForGuild: vi
        .fn()
        .mockRejectedValue(new Error("transport failure with {{question}} template"))
    });

    await expect(
      processor.process({
        guildId: "guild-placeholder-a",
        enqueuedAt: "2026-05-27T23:30:00.000Z"
      })
    ).rejects.toThrow("DAILY_CONTENT_QUEUE_PROCESSING_FAILED");
  });

  it("invokes stale recovery through the existing orchestrator and suppresses later duplicates", async () => {
    const settings = new InMemoryGuildPluginSettingsStore();
    await enableDailyContent(settings);
    const deliveries = new InMemoryDeliveryStore();
    const dedupeKey = dailyContentDedupeKey(dueJob);
    deliveries.seed({
      id: "delivery-stale",
      guildId: dueJob.guildId,
      scheduleId: dueJob.scheduleId,
      targetDate: dueJob.targetDate,
      contentSlot: dueJob.contentSlot,
      channelId: dueJob.channelId,
      dedupeKey,
      status: "processing",
      attemptCount: 1,
      createdAt: new Date("2026-05-27T23:00:00.000Z"),
      updatedAt: new Date("2026-05-27T23:00:00.000Z")
    });
    const publisher = { publish: vi.fn().mockResolvedValue(undefined) };
    const orchestrator = new DailyContentOrchestrator(
      settings,
      new DailyContentProcessor(deliveries, publisher, new InMemoryAuditLogStore())
    );
    const processor = new DailyContentQueueWorkerProcessor(
      orchestrator,
      () => new Date("2026-05-27T23:32:00.000Z")
    );
    const payload = parseDailyContentQueuePayload({
      guildId: "guild-placeholder-a",
      enqueuedAt: "2026-05-27T23:30:00.000Z",
      referenceTime: "2026-05-27T23:30:00.000Z"
    });

    const recovered = await processor.process(payload);
    const duplicate = await processor.process(payload);

    expect(buildDailyContentQueueJobId(payload)).toBe(
      "daily-content:due-guild:guild-placeholder-a:2026-05-27T23%3A30%3A00.000Z"
    );
    expect(recovered.publishedCount).toBe(1);
    expect(duplicate.alreadySucceededCount).toBe(1);
    expect(publisher.publish).toHaveBeenCalledTimes(1);
    expect((await deliveries.listByGuild("guild-placeholder-a"))[0]?.dedupeKey).toBe(dedupeKey);
  });
});
