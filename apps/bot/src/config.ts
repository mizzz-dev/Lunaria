import { z } from "zod";

const botEnvSchema = z.object({
  DISCORD_BOT_TOKEN: z.string().min(1, "DISCORD_BOT_TOKEN is required"),
  DISCORD_CLIENT_ID: z.string().min(1, "DISCORD_CLIENT_ID is required"),
  PRIMARY_GUILD_ID: z.string().min(1, "PRIMARY_GUILD_ID is required")
});

export type BotConfig = z.infer<typeof botEnvSchema>;

export function loadBotConfig(env: NodeJS.ProcessEnv = process.env): BotConfig {
  return botEnvSchema.parse(env);
}

