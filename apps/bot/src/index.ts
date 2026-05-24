import { config as loadDotenv } from "dotenv";
import { fileURLToPath } from "node:url";
import { loadBotConfig } from "./config.js";
import { startBot } from "./client.js";
import { acquireSingleInstanceLock } from "./single-instance.js";

loadDotenv({ quiet: true });
loadDotenv({
  path: fileURLToPath(new URL("../../../.env", import.meta.url)),
  override: false,
  quiet: true
});

try {
  acquireSingleInstanceLock(
    fileURLToPath(new URL("../../../.runtime/lunaria-bot.pid", import.meta.url))
  );
  await startBot(loadBotConfig());
} catch (error) {
  console.error("Failed to start Lunaria bot", error);
  process.exitCode = 1;
}
