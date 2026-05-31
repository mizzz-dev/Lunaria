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
      const delivery = await this.deliveries.fail(job.guildId, dedupeKey, "PUBLISH_FAILED");
      await this.recordAudit("daily_content.delivery.failed", delivery);
      throw error;
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
