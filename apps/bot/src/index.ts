import { loadBotConfig } from "./config.js";
import { startBot } from "./client.js";

try {
  await startBot(loadBotConfig());
} catch (error) {
  console.error("Failed to start Lunaria bot", error);
  process.exitCode = 1;
}

