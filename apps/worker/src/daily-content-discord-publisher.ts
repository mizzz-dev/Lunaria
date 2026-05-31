import { DailyContentPublishError, type DailyContentPublisher } from "./daily-content-processor.js";

export const DISCORD_API_BASE_URL = "https://discord.com/api/v10";

export type DailyContentDiscordFailureCode =
  | "DISCORD_CHANNEL_MESSAGE_BAD_REQUEST"
  | "DISCORD_CHANNEL_MESSAGE_UNAUTHORIZED"
  | "DISCORD_CHANNEL_MESSAGE_FORBIDDEN"
  | "DISCORD_CHANNEL_MESSAGE_NOT_FOUND"
  | "DISCORD_CHANNEL_MESSAGE_RATE_LIMITED"
  | "DISCORD_CHANNEL_MESSAGE_UNAVAILABLE"
  | "DISCORD_CHANNEL_MESSAGE_FAILED";

export interface DiscordChannelMessageClient {
  createMessage(input: {
    readonly channelId: string;
    readonly content: string;
  }): Promise<void>;
}

export class DiscordChannelMessageCreateError extends Error {
  constructor(readonly status: number) {
    super("DISCORD_CHANNEL_MESSAGE_REQUEST_FAILED");
    this.name = "DiscordChannelMessageCreateError";
  }
}

export class FetchDiscordChannelMessageClient implements DiscordChannelMessageClient {
  readonly #botToken: string;
  readonly #baseUrl: string;
  readonly #fetch: typeof fetch;

  constructor(input: {
    readonly botToken: string;
    readonly baseUrl?: string;
    readonly fetch?: typeof fetch;
  }) {
    this.#botToken = input.botToken;
    this.#baseUrl = input.baseUrl ?? DISCORD_API_BASE_URL;
    this.#fetch = input.fetch ?? fetch;
  }

  async createMessage(input: { readonly channelId: string; readonly content: string }): Promise<void> {
    const response = await this.#fetch(
      `${this.#baseUrl}/channels/${encodeURIComponent(input.channelId)}/messages`,
      {
        method: "POST",
        headers: {
          authorization: `Bot ${this.#botToken}`,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          content: input.content
        })
      }
    );

    if (!response.ok) {
      throw new DiscordChannelMessageCreateError(response.status);
    }
  }
}

export class DiscordDailyContentPublisher implements DailyContentPublisher {
  readonly #client: DiscordChannelMessageClient;

  constructor(client: DiscordChannelMessageClient) {
    this.#client = client;
  }

  async publish(job: {
    readonly channelId: string;
    readonly template: string;
    readonly dedupeKey: string;
  }): Promise<void> {
    try {
      await this.#client.createMessage({
        channelId: job.channelId,
        content: job.template
      });
    } catch (error) {
      throw new DailyContentPublishError(toDailyContentDiscordFailureCode(error));
    }
  }
}

export function toDailyContentDiscordFailureCode(error: unknown): DailyContentDiscordFailureCode {
  if (error instanceof DiscordChannelMessageCreateError) {
    return mapDiscordStatusToFailureCode(error.status);
  }

  return "DISCORD_CHANNEL_MESSAGE_FAILED";
}

function mapDiscordStatusToFailureCode(status: number): DailyContentDiscordFailureCode {
  if (status === 400) {
    return "DISCORD_CHANNEL_MESSAGE_BAD_REQUEST";
  }

  if (status === 401) {
    return "DISCORD_CHANNEL_MESSAGE_UNAUTHORIZED";
  }

  if (status === 403) {
    return "DISCORD_CHANNEL_MESSAGE_FORBIDDEN";
  }

  if (status === 404) {
    return "DISCORD_CHANNEL_MESSAGE_NOT_FOUND";
  }

  if (status === 429) {
    return "DISCORD_CHANNEL_MESSAGE_RATE_LIMITED";
  }

  if (status >= 500 && status <= 599) {
    return "DISCORD_CHANNEL_MESSAGE_UNAVAILABLE";
  }

  return "DISCORD_CHANNEL_MESSAGE_FAILED";
}
