import Fastify, { type FastifyInstance } from "fastify";

export function buildApi(): FastifyInstance {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? "info",
      redact: [
        "req.headers.authorization",
        "DISCORD_BOT_TOKEN",
        "DISCORD_CLIENT_SECRET",
        "OPENAI_API_KEY",
        "ANTHROPIC_API_KEY",
        "GEMINI_API_KEY",
        "RIOT_API_KEY"
      ]
    }
  });

  app.get("/health", async () => ({
    ok: true,
    service: "api",
    timestamp: new Date().toISOString()
  }));

  return app;
}

