import { Queue, Worker, type ConnectionOptions, type Job } from "bullmq";
import {
  type AuditLogStore,
  type DailyContentDeliveryStore,
  type GuildPluginSettingsStore
} from "@lunaria/core";
import {
  PrismaAuditLogStore,
  PrismaDailyContentDeliveryStore,
  PrismaGuildPluginSettingsStore,
  prisma
} from "@lunaria/db";
import { DailyContentOrchestrator } from "./daily-content-orchestrator.js";
import { DailyContentProcessor, type DailyContentPublisher } from "./daily-content-processor.js";
import {
  DAILY_CONTENT_QUEUE_NAME,
  DAILY_CONTENT_PROCESS_DUE_GUILD_JOB,
  DailyContentQueueProducer,
  DailyContentQueueWorkerProcessor,
  type DailyContentQueueJobResult,
  type DailyContentQueuePayload
} from "./daily-content-queue.js";

export interface DailyContentRuntimeLogger {
  info(message: string, metadata?: Record<string, unknown>): void;
  warn(message: string, metadata?: Record<string, unknown>): void;
  error(message: string, metadata?: Record<string, unknown>): void;
}

export interface DailyContentQueueRuntimeDependencies {
  readonly connection: ConnectionOptions;
  readonly settings: GuildPluginSettingsStore;
  readonly deliveries: DailyContentDeliveryStore;
  readonly auditLogs: AuditLogStore;
  readonly publisher: DailyContentPublisher;
  readonly concurrency?: number;
  readonly logger?: DailyContentRuntimeLogger;
}

export interface DailyContentQueueRuntime {
  readonly producer: DailyContentQueueProducer;
  readonly queue: Queue<DailyContentQueuePayload, DailyContentQueueJobResult>;
  readonly worker: Worker<
    DailyContentQueuePayload,
    DailyContentQueueJobResult,
    typeof DAILY_CONTENT_PROCESS_DUE_GUILD_JOB
  >;
  close(): Promise<void>;
}

export interface DailyContentClosableResource {
  close(): Promise<void>;
}

export function createDailyContentQueueRuntime(
  dependencies: DailyContentQueueRuntimeDependencies
): DailyContentQueueRuntime {
  const queue = new Queue<DailyContentQueuePayload, DailyContentQueueJobResult>(
    DAILY_CONTENT_QUEUE_NAME,
    {
      connection: dependencies.connection
    }
  );
  const processor = new DailyContentQueueWorkerProcessor(
    new DailyContentOrchestrator(
      dependencies.settings,
      new DailyContentProcessor(
        dependencies.deliveries,
        dependencies.publisher,
        dependencies.auditLogs
      )
    )
  );
  const worker = new Worker<
    DailyContentQueuePayload,
    DailyContentQueueJobResult,
    typeof DAILY_CONTENT_PROCESS_DUE_GUILD_JOB
  >(
    DAILY_CONTENT_QUEUE_NAME,
    async (job: Job<DailyContentQueuePayload, DailyContentQueueJobResult>) =>
      processor.process(job.data),
    {
      connection: dependencies.connection,
      concurrency: dependencies.concurrency ?? 1
    }
  );
  const logger = dependencies.logger;

  worker.on("completed", (job, result) => {
    logger?.info("Daily Content queue job completed", {
      jobId: job.id,
      name: job.name,
      guildId: result.guildId,
      dueJobCount: result.dueJobCount,
      publishedCount: result.publishedCount,
      skippedCount: result.skippedCount
    });
  });
  worker.on("failed", (job) => {
    logger?.warn("Daily Content queue job failed", {
      jobId: job?.id,
      name: job?.name,
      guildId: job?.data.guildId
    });
  });
  worker.on("error", () => {
    logger?.error("Daily Content queue worker error");
  });

  return {
    producer: new DailyContentQueueProducer(queue),
    queue,
    worker,
    async close() {
      await closeDailyContentQueueResources([worker, queue]);
    }
  };
}

export async function closeDailyContentQueueResources(
  resources: readonly DailyContentClosableResource[]
): Promise<void> {
  for (const resource of resources) {
    await resource.close();
  }
}

export function createPrismaDailyContentQueueRuntime(input: {
  readonly connection: ConnectionOptions;
  readonly publisher: DailyContentPublisher;
  readonly concurrency?: number;
  readonly logger?: DailyContentRuntimeLogger;
}): DailyContentQueueRuntime {
  return createDailyContentQueueRuntime({
    connection: input.connection,
    settings: new PrismaGuildPluginSettingsStore(prisma),
    deliveries: new PrismaDailyContentDeliveryStore(prisma),
    auditLogs: new PrismaAuditLogStore(prisma),
    publisher: input.publisher,
    ...(input.concurrency ? { concurrency: input.concurrency } : {}),
    ...(input.logger ? { logger: input.logger } : {})
  });
}

export async function closePrismaDailyContentQueueRuntime(
  runtime: Pick<DailyContentQueueRuntime, "close">
): Promise<void> {
  await runtime.close();
  await prisma.$disconnect();
}

export class DisabledDailyContentPublisher implements DailyContentPublisher {
  async publish(): Promise<void> {
    throw new Error("DAILY_CONTENT_PUBLISHER_NOT_CONFIGURED");
  }
}
