import { z } from "zod";

const workerEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  REDIS_URL: z.string().url().default("redis://localhost:6379"),
  DAILY_CONTENT_WORKER_CONCURRENCY: z.coerce.number().int().min(1).max(16).default(1),
  DAILY_CONTENT_SCHEDULER_INTERVAL_MS: z.coerce
    .number()
    .int()
    .min(1_000)
    .max(60 * 60 * 1_000)
    .default(60_000)
});

export type WorkerConfig = z.infer<typeof workerEnvSchema>;

export function loadWorkerConfig(env: NodeJS.ProcessEnv = process.env): WorkerConfig {
  return workerEnvSchema.parse(env);
}

export function toRedisConnectionOptions(redisUrl: string): { readonly url: string } {
  return { url: redisUrl };
}
