import { describe, expect, it } from "vitest";
import { loadBotConfig } from "./config.js";

describe("bot config", () => {
  it("loads required Discord settings", () => {
    expect(
      loadBotConfig({
        DISCORD_BOT_TOKEN: "token",
        DISCORD_CLIENT_ID: "client-id",
        PRIMARY_GUILD_ID: "guild-id"
      })
    ).toEqual({
      DISCORD_BOT_TOKEN: "token",
      DISCORD_CLIENT_ID: "client-id",
      PRIMARY_GUILD_ID: "guild-id"
    });
  });

  it("rejects missing token", () => {
    expect(() =>
      loadBotConfig({
        DISCORD_CLIENT_ID: "client-id",
        PRIMARY_GUILD_ID: "guild-id"
      })
    ).toThrow();
  });
});

