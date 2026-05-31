import {
  DAILY_CONTENT_PLUGIN_ID,
  DAILY_CONTENT_WORKER_ACTOR_ID,
  dailyContentDedupeKey,
  type AuditLogStore,
  type DailyContentDeliveryRecord,
  type DailyContentDeliveryStore,
  type DailyContentDueJob
} from "@lunaria/core";

export interface DailyContentPublisher {
  publish(job: DailyContentDueJob & { readonly dedupeKey: string }): Promise<void>;
}

export const DAILY_CONTENT_PUBLISH_FAILED = "PUBLISH_FAILED";

export class DailyContentPublishError extends Error {
  constructor(readonly failureCode: string = DAILY_CONTENT_PUBLISH_FAILED) {
    super(failureCode);
    this.name = "DailyContentPublishError";
  }
}

export type DailyContentProcessingResult =
  | { readonly state: "published"; readonly delivery: DailyContentDeliveryRecord }
  | {
      readonly state: "skipped";
      readonly reason: "already_succeeded" | "already_processing";
      readonly delivery: DailyContentDeliveryRecord;
    };

export class DailyContentProcessor {
  constructor(
    private readonly deliveries: DailyContentDeliveryStore,
    private readonly publisher: DailyContentPublisher,
    private readonly auditLogs: AuditLogStore,
    private readonly now = () => new Date()
  ) {}

  async process(
    job: DailyContentDueJob,
    referenceTime = this.now()
  ): Promise<DailyContentProcessingResult> {
    const claim = await this.deliveries.claim(job, referenceTime);

    if (claim.state !== "claimed") {
      return {
        state: "skipped",
        reason: claim.state,
        delivery: claim.delivery
      };
    }

    const dedupeKey = dailyContentDedupeKey(job);

    try {
      await this.publisher.publish({ ...job, dedupeKey });
    } catch (error) {
      const failureCode = getDailyContentPublishFailureCode(error);
      const delivery = await this.deliveries.fail(job.guildId, dedupeKey, failureCode);
      await this.recordAudit("daily_content.delivery.failed", delivery);
      throw new DailyContentPublishError(failureCode);
    }

    const delivery = await this.deliveries.succeed(job.guildId, dedupeKey, referenceTime);
    await this.recordAudit("daily_content.delivery.succeeded", delivery);
    return { state: "published", delivery };
  }

  private async recordAudit(
    type: "daily_content.delivery.succeeded" | "daily_content.delivery.failed",
    delivery: DailyContentDeliveryRecord
  ): Promise<void> {
    await this.auditLogs.append({
      guildId: delivery.guildId,
      pluginId: DAILY_CONTENT_PLUGIN_ID,
      type,
      actorUserId: DAILY_CONTENT_WORKER_ACTOR_ID,
      targetId: delivery.id,
      data: {
        dedupeKey: delivery.dedupeKey,
        scheduleId: delivery.scheduleId,
        targetDate: delivery.targetDate,
        contentSlot: delivery.contentSlot,
        attemptCount: delivery.attemptCount
      }
    });
  }
}

export function getDailyContentPublishFailureCode(error: unknown): string {
  if (
    error &&
    typeof error === "object" &&
    "failureCode" in error &&
    typeof error.failureCode === "string" &&
    /^[A-Z0-9_]{1,80}$/.test(error.failureCode)
  ) {
    return error.failureCode;
  }

  return DAILY_CONTENT_PUBLISH_FAILED;
}
