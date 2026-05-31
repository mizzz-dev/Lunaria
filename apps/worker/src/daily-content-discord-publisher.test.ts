import { describe, expect, it, vi } from "vitest";
import {
  DiscordChannelMessageCreateError,
  DiscordDailyContentPublisher,
  FetchDiscordChannelMessageClient
} from "./daily-content-discord-publisher.js";
import { DailyContentPublishError } from "./daily-content-processor.js";

const job = {
  guildId: "guild-placeholder-a",
  scheduleId: "daily-morning",
  targetDate: "2026-05-28",
  channelId: "channel-placeholder-1",
  contentSlot: "question" as const,
  template: "今日の質問: {{question}}",
  dedupeKey: "daily-content:guild-placeholder-a:daily-morning:2026-05-28:question"
};

describe("DiscordDailyContentPublisher", () => {
  it("sends the Daily Content template to the target Discord channel through an injectable client", async () => {
    const client = {
      createMessage: vi.fn().mockResolvedValue(undefined)
    };
    const publisher = new DiscordDailyContentPublisher(client);

    await publisher.publish(job);

    expect(client.createMessage).toHaveBeenCalledWith({
      channelId: "channel-placeholder-1",
      content: "今日の質問: {{question}}"
    });
  });

  it("normalizes Discord API failures to sanitized failure codes without preserving response body text", async () => {
    const client = {
      createMessage: vi.fn().mockRejectedValue(new DiscordChannelMessageCreateError(403))
    };
    const publisher = new DiscordDailyContentPublisher(client);

    await expect(publisher.publish(job)).rejects.toMatchObject({
      failureCode: "DISCORD_CHANNEL_MESSAGE_FORBIDDEN"
    });

    await expect(publisher.publish(job)).rejects.not.toThrow("Missing Permissions");
  });

  it("does not leak token, authorization, secret, or template text from raw client errors", async () => {
    const rawError = new Error(
      "authorization=Bot test-token secret response body 今日の質問: {{question}}"
    );
    const client = {
      createMessage: vi.fn().mockRejectedValue(rawError)
    };
    const publisher = new DiscordDailyContentPublisher(client);

    let caught: unknown;
    try {
      await publisher.publish(job);
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(DailyContentPublishError);
    expect(String(caught)).toContain("DISCORD_CHANNEL_MESSAGE_FAILED");
    expect(JSON.stringify(caught)).not.toContain("test-token");
    expect(JSON.stringify(caught)).not.toContain("authorization");
    expect(JSON.stringify(caught)).not.toContain("secret");
    expect(JSON.stringify(caught)).not.toContain("{{question}}");
  });
});

describe("FetchDiscordChannelMessageClient", () => {
  it("uses Discord REST channel message create without exposing the bot token on the client object", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue({
      ok: true,
      status: 200
    } as Response);
    const client = new FetchDiscordChannelMessageClient({
      botToken: "test-token",
      baseUrl: "https://discord.test/api",
      fetch: fetchMock
    });

    await client.createMessage({
      channelId: "channel-placeholder-1",
      content: "今日の質問: {{question}}"
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://discord.test/api/channels/channel-placeholder-1/messages",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ content: "今日の質問: {{question}}" })
      })
    );
    expect(JSON.stringify(client)).not.toContain("test-token");
  });

  it("does not read or preserve Discord error response bodies", async () => {
    const response = {
      ok: false,
      status: 400,
      text: vi.fn().mockResolvedValue("secret response body")
    } as unknown as Response;
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(response);
    const client = new FetchDiscordChannelMessageClient({
      botToken: "test-token",
      baseUrl: "https://discord.test/api",
      fetch: fetchMock
    });

    await expect(
      client.createMessage({
        channelId: "channel-placeholder-1",
        content: "今日の質問: {{question}}"
      })
    ).rejects.toMatchObject({
      status: 400
    });
    expect(response.text).not.toHaveBeenCalled();
  });
});
