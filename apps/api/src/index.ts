import { buildApi } from "./app.js";
import { loadApiConfig } from "./config.js";

const config = loadApiConfig();
const app = buildApi();

try {
  await app.listen({
    host: config.API_HOST,
    port: config.API_PORT
  });
} catch (error) {
  app.log.error(error, "Failed to start Lunaria API");
  process.exitCode = 1;
}

