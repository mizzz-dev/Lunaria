import { config as loadDotenv } from "dotenv";
import { fileURLToPath } from "node:url";
import { loadWorkerConfig, toRedisConnectionOptions } from "./config.js";
import {
  closePrismaDailyContentQueueRuntime,
  createDailyContentPublisherRuntime,
  createPrismaDailyContentQueueRuntime,
  type DailyContentQueueRuntime
} from "./daily-content-runtime.js";

loadDotenv({ quiet: true });
loadDotenv({
  path: fileURLToPath(new URL("../../../.env", import.meta.url)),
  override: false,
  quiet: true
});

const config = loadWorkerConfig();
let runtime: DailyContentQueueRuntime | undefined;
let closing = false;

const logger = {
  info(message: string, metadata?: Record<string, unknown>) {
    console.info(message, metadata ?? {});
  },
  warn(message: string, metadata?: Record<string, unknown>) {
    console.warn(message, metadata ?? {});
  },
  error(message: string, metadata?: Record<string, unknown>) {
    console.error(message, metadata ?? {});
  }
};

async function shutdown(signal: NodeJS.Signals): Promise<void> {
  if (closing) {
    return;
  }

  closing = true;
  logger.info("Stopping Lunaria worker", { signal });

  if (runtime) {
    await closePrismaDailyContentQueueRuntime(runtime);
  }
}

process.once("SIGINT", (signal) => {
  void shutdown(signal);
});
process.once("SIGTERM", (signal) => {
  void shutdown(signal);
});

try {
  const dailyContentPublisher = createDailyContentPublisherRuntime(config);

  runtime = createPrismaDailyContentQueueRuntime({
    connection: toRedisConnectionOptions(config.REDIS_URL),
    concurrency: config.DAILY_CONTENT_WORKER_CONCURRENCY,
    schedulerIntervalMs: config.DAILY_CONTENT_SCHEDULER_INTERVAL_MS,
    publisher: dailyContentPublisher.publisher,
    logger
  });
  logger.info("Lunaria worker ready", {
    dailyContentQueue: "enabled",
    dailyContentScheduler: "enabled",
    dailyContentPublisher: dailyContentPublisher.mode
  });
} catch {
  logger.error("Failed to start Lunaria worker");
  process.exitCode = 1;
}
