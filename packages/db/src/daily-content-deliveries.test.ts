import { DAILY_CONTENT_PROCESSING_STALE_AFTER_MS } from "@lunaria/core";
import type { PrismaClient } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PrismaDailyContentDeliveryStore } from "./daily-content-deliveries.js";

const createdAt = new Date("2026-05-28T00:00:00.000Z");
const job = {
  guildId: "guild-placeholder-a",
  scheduleId: "daily-morning",
  targetDate: "2026-05-28",
  channelId: "channel-placeholder-1",
  contentSlot: "question" as const,
  template: "今日の質問: {{question}}"
};
const record = {
  id: "delivery-1",
  ...job,
  dedupeKey: "daily-content:guild-placeholder-a:daily-morning:2026-05-28:question",
  status: "processing",
  attemptCount: 1,
  failureCode: null,
  publishedAt: null,
  createdAt,
  updatedAt: createdAt
};

const client = {
  guild: {
    upsert: vi.fn()
  },
  dailyContentDelivery: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    updateMany: vi.fn()
  }
};

describe("PrismaDailyContentDeliveryStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    client.guild.upsert.mockResolvedValue({});
    client.dailyContentDelivery.findUnique.mockResolvedValue(null);
    client.dailyContentDelivery.create.mockResolvedValue(record);
    client.dailyContentDelivery.updateMany.mockResolvedValue({ count: 1 });
    client.dailyContentDelivery.findFirst.mockResolvedValue(record);
    client.dailyContentDelivery.findMany.mockResolvedValue([record]);
  });

  it("claims a delivery using a deterministic guild-scoped key", async () => {
    const store = new PrismaDailyContentDeliveryStore(client as unknown as PrismaClient);
    const claim = await store.claim(job, createdAt);

    expect(claim.state).toBe("claimed");
    expect(client.dailyContentDelivery.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        guildId: "guild-placeholder-a",
        dedupeKey: record.dedupeKey,
        status: "processing",
        updatedAt: createdAt
      })
    });
  });

  it("does not claim an already successful delivery again", async () => {
    client.dailyContentDelivery.findUnique.mockResolvedValue({
      ...record,
      status: "succeeded",
      publishedAt: createdAt
    });
    const store = new PrismaDailyContentDeliveryStore(client as unknown as PrismaClient);

    const claim = await store.claim(job);

    expect(claim.state).toBe("already_succeeded");
    expect(client.dailyContentDelivery.create).not.toHaveBeenCalled();
  });

  it("reclaims a retryable failure and increments its attempt count", async () => {
    client.dailyContentDelivery.findUnique.mockResolvedValue({
      ...record,
      status: "retryable_failure",
      failureCode: "PUBLISH_FAILED"
    });
    client.dailyContentDelivery.findFirst.mockResolvedValue({
      ...record,
      attemptCount: 2
    });
    const store = new PrismaDailyContentDeliveryStore(client as unknown as PrismaClient);

    const claim = await store.claim(job, createdAt);

    expect(claim.state).toBe("claimed");
    expect(client.dailyContentDelivery.updateMany).toHaveBeenCalledWith({
      where: { id: "delivery-1", guildId: "guild-placeholder-a", status: "retryable_failure" },
      data: {
        status: "processing",
        attemptCount: { increment: 1 },
        failureCode: null,
        updatedAt: createdAt
      }
    });
    expect(claim.delivery.attemptCount).toBe(2);
  });

  it("recovers only a stale processing delivery using the same scoped key", async () => {
    const recoveryAt = new Date("2026-05-28T00:30:00.000Z");
    const staleBefore = new Date(recoveryAt.getTime() - DAILY_CONTENT_PROCESSING_STALE_AFTER_MS);
    client.dailyContentDelivery.findUnique.mockResolvedValue({
      ...record,
      updatedAt: staleBefore
    });
    client.dailyContentDelivery.findFirst.mockResolvedValue({
      ...record,
      attemptCount: 2,
      updatedAt: recoveryAt
    });
    const store = new PrismaDailyContentDeliveryStore(client as unknown as PrismaClient);

    const claim = await store.claim(job, recoveryAt);

    expect(claim.state).toBe("claimed");
    expect(client.dailyContentDelivery.updateMany).toHaveBeenCalledWith({
      where: {
        id: "delivery-1",
        guildId: "guild-placeholder-a",
        status: "processing",
        updatedAt: { lte: staleBefore }
      },
      data: {
        attemptCount: { increment: 1 },
        failureCode: null,
        updatedAt: recoveryAt
      }
    });
    expect(claim.delivery.dedupeKey).toBe(record.dedupeKey);
  });

  it("does not recover a processing delivery before its timeout", async () => {
    const recoveryAt = new Date("2026-05-28T00:10:00.000Z");
    client.dailyContentDelivery.findUnique.mockResolvedValue(record);
    const store = new PrismaDailyContentDeliveryStore(client as unknown as PrismaClient);

    const claim = await store.claim(job, recoveryAt);

    expect(claim.state).toBe("already_processing");
    expect(client.dailyContentDelivery.updateMany).not.toHaveBeenCalled();
  });

  it("lists deliveries within one guild only", async () => {
    const store = new PrismaDailyContentDeliveryStore(client as unknown as PrismaClient);
    await store.listByGuild("guild-placeholder-a");

    expect(client.dailyContentDelivery.findMany).toHaveBeenCalledWith({
      where: { guildId: "guild-placeholder-a" },
      orderBy: { createdAt: "desc" }
    });
  });

  it("records a successful result only within the claimed guild delivery", async () => {
    client.dailyContentDelivery.findFirst.mockResolvedValue({
      ...record,
      status: "succeeded",
      publishedAt: createdAt
    });
    const store = new PrismaDailyContentDeliveryStore(client as unknown as PrismaClient);

    const delivered = await store.succeed("guild-placeholder-a", record.dedupeKey, createdAt);

    expect(client.dailyContentDelivery.updateMany).toHaveBeenCalledWith({
      where: {
        guildId: "guild-placeholder-a",
        dedupeKey: record.dedupeKey,
        status: "processing"
      },
      data: {
        status: "succeeded",
        publishedAt: createdAt,
        failureCode: null
      }
    });
    expect(delivered.status).toBe("succeeded");
  });

  it("stores a retryable failure without persisting transport details", async () => {
    client.dailyContentDelivery.findFirst.mockResolvedValue({
      ...record,
      status: "retryable_failure",
      failureCode: "PUBLISH_FAILED"
    });
    const store = new PrismaDailyContentDeliveryStore(client as unknown as PrismaClient);

    const failed = await store.fail("guild-placeholder-a", record.dedupeKey, "PUBLISH_FAILED");

    expect(client.dailyContentDelivery.updateMany).toHaveBeenCalledWith({
      where: {
        guildId: "guild-placeholder-a",
        dedupeKey: record.dedupeKey,
        status: "processing"
      },
      data: {
        status: "retryable_failure",
        failureCode: "PUBLISH_FAILED"
      }
    });
    expect(failed.failureCode).toBe("PUBLISH_FAILED");
  });
});
