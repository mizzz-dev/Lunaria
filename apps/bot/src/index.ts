import { config as loadDotenv } from "dotenv";
import { fileURLToPath } from "node:url";
import { loadBotConfig } from "./config.js";
import { startBot } from "./client.js";

loadDotenv();
loadDotenv({
  path: fileURLToPath(new URL("../../../.env", import.meta.url)),
  override: false
});

try {
  await startBot(loadBotConfig());
} catch (error) {
  console.error("Failed to start Lunaria bot", error);
  process.exitCode = 1;
}
