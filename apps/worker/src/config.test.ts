import { describe, expect, it } from "vitest";
import { loadWorkerConfig } from "./config.js";

describe("loadWorkerConfig", () => {
  it("defaults Daily Content publishing to disabled", () => {
    const config = loadWorkerConfig({});

    expect(config.DAILY_CONTENT_PUBLISHER).toBe("disabled");
  });

  it("requires a Discord bot token only when the Daily Content Discord publisher is enabled", () => {
    expect(() =>
      loadWorkerConfig({
        DAILY_CONTENT_PUBLISHER: "discord"
      })
    ).toThrow("DISCORD_BOT_TOKEN_REQUIRED_FOR_DAILY_CONTENT_DISCORD_PUBLISHER");

    expect(
      loadWorkerConfig({
        DAILY_CONTENT_PUBLISHER: "discord",
        DISCORD_BOT_TOKEN: "test-token"
      }).DAILY_CONTENT_PUBLISHER
    ).toBe("discord");
  });
});
