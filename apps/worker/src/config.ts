import { z } from "zod";

const workerEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  REDIS_URL: z.string().url().default("redis://localhost:6379"),
  DAILY_CONTENT_PUBLISHER: z.enum(["disabled", "discord"]).default("disabled"),
  DISCORD_BOT_TOKEN: z.string().optional(),
  DAILY_CONTENT_WORKER_CONCURRENCY: z.coerce.number().int().min(1).max(16).default(1),
  DAILY_CONTENT_SCHEDULER_INTERVAL_MS: z.coerce
    .number()
    .int()
    .min(1_000)
    .max(60 * 60 * 1_000)
    .default(60_000)
}).superRefine((env, context) => {
  if (env.DAILY_CONTENT_PUBLISHER === "discord" && !env.DISCORD_BOT_TOKEN?.trim()) {
    context.addIssue({
      code: "custom",
      path: ["DISCORD_BOT_TOKEN"],
      message: "DISCORD_BOT_TOKEN_REQUIRED_FOR_DAILY_CONTENT_DISCORD_PUBLISHER"
    });
  }
});

export type WorkerConfig = z.infer<typeof workerEnvSchema>;

export function loadWorkerConfig(env: NodeJS.ProcessEnv = process.env): WorkerConfig {
  return workerEnvSchema.parse(env);
}

export function toRedisConnectionOptions(redisUrl: string): { readonly url: string } {
  return { url: redisUrl };
}
