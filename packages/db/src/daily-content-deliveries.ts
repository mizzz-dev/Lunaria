import {
  DAILY_CONTENT_PROCESSING_STALE_AFTER_MS,
  dailyContentDedupeKey,
  type DailyContentDeliveryClaim,
  type DailyContentDeliveryRecord,
  type DailyContentDeliveryStatus,
  type DailyContentDeliveryStore,
  type DailyContentDueJob,
  type DailyContentSlot
} from "@lunaria/core";
import { Prisma, type PrismaClient } from "@prisma/client";
import { ensureGuild } from "./guilds.js";

type DeliveryRow = {
  id: string;
  guildId: string;
  scheduleId: string;
  targetDate: string;
  contentSlot: string;
  channelId: string;
  dedupeKey: string;
  status: string;
  attemptCount: number;
  failureCode: string | null;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export class PrismaDailyContentDeliveryStore implements DailyContentDeliveryStore {
  constructor(private readonly prisma: PrismaClient) {}

  async claim(job: DailyContentDueJob, claimedAt = new Date()): Promise<DailyContentDeliveryClaim> {
    await ensureGuild(this.prisma, { id: job.guildId });
    const dedupeKey = dailyContentDedupeKey(job);
    const existing = await this.prisma.dailyContentDelivery.findUnique({
      where: { dedupeKey }
    });

    if (existing) {
      return this.claimExisting(job.guildId, existing, claimedAt);
    }

    try {
      const delivery = await this.prisma.dailyContentDelivery.create({
        data: {
          guildId: job.guildId,
          scheduleId: job.scheduleId,
          targetDate: job.targetDate,
          contentSlot: job.contentSlot,
          channelId: job.channelId,
          dedupeKey,
          status: "processing",
          updatedAt: claimedAt
        }
      });
      return { state: "claimed", delivery: this.toDomain(delivery) };
    } catch (error) {
      if (!this.isUniqueConflict(error)) {
        throw error;
      }

      const concurrent = await this.prisma.dailyContentDelivery.findUnique({
        where: { dedupeKey }
      });

      if (!concurrent) {
        throw error;
      }

      return this.claimExisting(job.guildId, concurrent, claimedAt);
    }
  }

  async succeed(
    guildId: string,
    dedupeKey: string,
    publishedAt: Date
  ): Promise<DailyContentDeliveryRecord> {
    const result = await this.prisma.dailyContentDelivery.updateMany({
      where: { guildId, dedupeKey, status: "processing" },
      data: {
        status: "succeeded",
        publishedAt,
        failureCode: null
      }
    });

    if (result.count !== 1) {
      throw new Error("DAILY_CONTENT_DELIVERY_NOT_PROCESSING");
    }

    return this.requireByGuildKey(guildId, dedupeKey);
  }

  async fail(
    guildId: string,
    dedupeKey: string,
    failureCode: string
  ): Promise<DailyContentDeliveryRecord> {
    const result = await this.prisma.dailyContentDelivery.updateMany({
      where: { guildId, dedupeKey, status: "processing" },
      data: {
        status: "retryable_failure",
        failureCode
      }
    });

    if (result.count !== 1) {
      throw new Error("DAILY_CONTENT_DELIVERY_NOT_PROCESSING");
    }

    return this.requireByGuildKey(guildId, dedupeKey);
  }

  async listByGuild(guildId: string): Promise<DailyContentDeliveryRecord[]> {
    const records = await this.prisma.dailyContentDelivery.findMany({
      where: { guildId },
      orderBy: { createdAt: "desc" }
    });

    return records.map((record) => this.toDomain(record));
  }

  private async claimExisting(
    guildId: string,
    record: DeliveryRow,
    claimedAt: Date
  ): Promise<DailyContentDeliveryClaim> {
    if (record.guildId !== guildId) {
      throw new Error("DAILY_CONTENT_DELIVERY_SCOPE_MISMATCH");
    }

    if (record.status === "succeeded") {
      return { state: "already_succeeded", delivery: this.toDomain(record) };
    }

    if (record.status === "processing") {
      const staleBefore = new Date(claimedAt.getTime() - DAILY_CONTENT_PROCESSING_STALE_AFTER_MS);

      if (record.updatedAt > staleBefore) {
        return { state: "already_processing", delivery: this.toDomain(record) };
      }

      const recovered = await this.prisma.dailyContentDelivery.updateMany({
        where: {
          id: record.id,
          guildId,
          status: "processing",
          updatedAt: { lte: staleBefore }
        },
        data: {
          attemptCount: { increment: 1 },
          failureCode: null,
          updatedAt: claimedAt
        }
      });

      if (recovered.count !== 1) {
        return this.resolveConcurrentClaim(guildId, record.dedupeKey);
      }

      return {
        state: "claimed",
        delivery: await this.requireByGuildKey(guildId, record.dedupeKey)
      };
    }

    if (record.status !== "retryable_failure") {
      throw new Error("DAILY_CONTENT_DELIVERY_INVALID_STATUS");
    }

    const claimed = await this.prisma.dailyContentDelivery.updateMany({
      where: { id: record.id, guildId, status: "retryable_failure" },
      data: {
        status: "processing",
        attemptCount: { increment: 1 },
        failureCode: null,
        updatedAt: claimedAt
      }
    });

    if (claimed.count !== 1) {
      return this.resolveConcurrentClaim(guildId, record.dedupeKey);
    }

    return {
      state: "claimed",
      delivery: await this.requireByGuildKey(guildId, record.dedupeKey)
    };
  }

  private async resolveConcurrentClaim(
    guildId: string,
    dedupeKey: string
  ): Promise<DailyContentDeliveryClaim> {
    const current = await this.requireByGuildKey(guildId, dedupeKey);
    return current.status === "succeeded"
      ? { state: "already_succeeded", delivery: current }
      : { state: "already_processing", delivery: current };
  }

  private async requireByGuildKey(
    guildId: string,
    dedupeKey: string
  ): Promise<DailyContentDeliveryRecord> {
    const record = await this.prisma.dailyContentDelivery.findFirst({
      where: { guildId, dedupeKey }
    });

    if (!record) {
      throw new Error("DAILY_CONTENT_DELIVERY_NOT_FOUND");
    }

    return this.toDomain(record);
  }

  private isUniqueConflict(error: unknown): boolean {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
  }

  private toDomain(record: DeliveryRow): DailyContentDeliveryRecord {
    return {
      id: record.id,
      guildId: record.guildId,
      scheduleId: record.scheduleId,
      targetDate: record.targetDate,
      contentSlot: record.contentSlot as DailyContentSlot,
      channelId: record.channelId,
      dedupeKey: record.dedupeKey,
      status: record.status as DailyContentDeliveryStatus,
      attemptCount: record.attemptCount,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      ...(record.failureCode ? { failureCode: record.failureCode } : {}),
      ...(record.publishedAt ? { publishedAt: record.publishedAt } : {})
    };
  }
}
