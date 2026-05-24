import { config as loadDotenv } from "dotenv";
import { resolve } from "node:path";
import { z } from "zod";

loadDotenv({ quiet: true });
loadDotenv({
  path: resolve(process.cwd(), "../../.env"),
  override: false,
  quiet: true
});

const dashboardEnvSchema = z.object({
  DISCORD_CLIENT_ID: z.string().min(1),
  DISCORD_CLIENT_SECRET: z.string().min(1),
  DISCORD_CALLBACK_URL: z.string().url(),
  SESSION_SECRET: z.string().min(16),
  PRIMARY_GUILD_ID: z.string().min(1).optional()
});

export type DashboardEnv = z.infer<typeof dashboardEnvSchema>;

export function loadDashboardEnv(): DashboardEnv {
  return dashboardEnvSchema.parse(process.env);
}
