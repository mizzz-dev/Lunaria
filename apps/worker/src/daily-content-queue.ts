import type { JobsOptions } from "bullmq";
import { z } from "zod";
import type { DailyContentOrchestrationResult, DailyContentOrchestrator } from "./daily-content-orchestrator.js";

export const DAILY_CONTENT_QUEUE_NAME = "daily-content";
export const DAILY_CONTENT_PROCESS_DUE_GUILD_JOB = "daily-content.process-due-guild";

const dailyContentQueuePayloadSchema = z
  .object({
    guildId: z.string().min(1).max(64),
    enqueuedAt: z.string().datetime({ offset: true }),
    referenceTime: z.string().datetime({ offset: true }).optional()
  })
  .strict();

export type DailyContentQueuePayload = z.infer<typeof dailyContentQueuePayloadSchema>;

export interface DailyContentQueueJobResult {
  readonly guildId: string;
  readonly dueJobCount: number;
  readonly publishedCount: number;
  readonly skippedCount: number;
  readonly alreadySucceededCount: number;
  readonly alreadyProcessingCount: number;
  readonly processedAt: string;
}

export interface DailyContentQueueLike {
  add(
    name: typeof DAILY_CONTENT_PROCESS_DUE_GUILD_JOB,
    data: DailyContentQueuePayload,
    options: JobsOptions
  ): Promise<unknown>;
}

export interface EnqueueDailyContentDueGuildInput {
  readonly guildId: string;
  readonly enqueuedAt?: Date;
  readonly referenceTime?: Date;
}

export class DailyContentQueueProducer {
  constructor(
    private readonly queue: DailyContentQueueLike,
    private readonly now = () => new Date()
  ) {}

  async enqueueDueGuild(input: EnqueueDailyContentDueGuildInput): Promise<unknown> {
    const payload = parseDailyContentQueuePayload({
      guildId: input.guildId,
      enqueuedAt: (input.enqueuedAt ?? this.now()).toISOString(),
      ...(input.referenceTime ? { referenceTime: input.referenceTime.toISOString() } : {})
    });

    return this.queue.add(DAILY_CONTENT_PROCESS_DUE_GUILD_JOB, payload, {
      jobId: buildDailyContentQueueJobId(payload),
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 30_000
      },
      removeOnComplete: {
        age: 24 * 60 * 60,
        count: 1_000
      },
      removeOnFail: {
        age: 7 * 24 * 60 * 60,
        count: 5_000
      }
    });
  }
}

export class DailyContentQueueWorkerProcessor {
  constructor(
    private readonly orchestrator: Pick<DailyContentOrchestrator, "processDueForGuild">,
    private readonly now = () => new Date()
  ) {}

  async process(payload: unknown): Promise<DailyContentQueueJobResult> {
    const parsed = parseDailyContentQueuePayload(payload);
    const referenceTime = new Date(parsed.referenceTime ?? parsed.enqueuedAt);
    let result: DailyContentOrchestrationResult;

    try {
      result = await this.orchestrator.processDueForGuild(parsed.guildId, referenceTime);
    } catch {
      throw new Error("DAILY_CONTENT_QUEUE_PROCESSING_FAILED");
    }

    return toSafeJobResult(parsed.guildId, result, this.now());
  }
}

export function parseDailyContentQueuePayload(payload: unknown): DailyContentQueuePayload {
  const parsed = dailyContentQueuePayloadSchema.safeParse(payload);

  if (!parsed.success) {
    throw new Error("DAILY_CONTENT_QUEUE_PAYLOAD_INVALID");
  }

  return parsed.data;
}

export function buildDailyContentQueueJobId(payload: DailyContentQueuePayload): string {
  return [
    DAILY_CONTENT_QUEUE_NAME,
    "due-guild",
    encodeURIComponent(payload.guildId),
    encodeURIComponent(payload.referenceTime ?? payload.enqueuedAt)
  ].join(":");
}

function toSafeJobResult(
  guildId: string,
  result: DailyContentOrchestrationResult,
  processedAt: Date
): DailyContentQueueJobResult {
  let publishedCount = 0;
  let alreadySucceededCount = 0;
  let alreadyProcessingCount = 0;

  for (const item of result.results) {
    if (item.state === "published") {
      publishedCount += 1;
      continue;
    }

    if (item.reason === "already_succeeded") {
      alreadySucceededCount += 1;
    } else {
      alreadyProcessingCount += 1;
    }
  }

  return {
    guildId,
    dueJobCount: result.jobs.length,
    publishedCount,
    skippedCount: alreadySucceededCount + alreadyProcessingCount,
    alreadySucceededCount,
    alreadyProcessingCount,
    processedAt: processedAt.toISOString()
  };
}
