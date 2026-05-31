import { describe, expect, it, vi } from "vitest";
import {
  DisabledDailyContentPublisher,
  closeDailyContentQueueResources,
  createDailyContentPublisherRuntime
} from "./daily-content-runtime.js";
import { DiscordDailyContentPublisher } from "./daily-content-discord-publisher.js";

describe("Daily Content queue runtime", () => {
  it("closes scheduler, worker, and queue runtime resources in order for graceful shutdown", async () => {
    const closed: string[] = [];
    const scheduler = {
      close: vi.fn(async () => {
        closed.push("scheduler");
      })
    };
    const worker = {
      close: vi.fn(async () => {
        closed.push("worker");
      })
    };
    const queue = {
      close: vi.fn(async () => {
        closed.push("queue");
      })
    };

    await closeDailyContentQueueResources([scheduler, worker, queue]);

    expect(closed).toEqual(["scheduler", "worker", "queue"]);
    expect(scheduler.close).toHaveBeenCalledOnce();
    expect(worker.close).toHaveBeenCalledOnce();
    expect(queue.close).toHaveBeenCalledOnce();
  });

  it("selects the disabled Daily Content publisher explicitly for unconfigured runtimes", () => {
    const runtime = createDailyContentPublisherRuntime({
      DAILY_CONTENT_PUBLISHER: "disabled"
    });

    expect(runtime.mode).toBe("disabled");
    expect(runtime.publisher).toBeInstanceOf(DisabledDailyContentPublisher);
  });

  it("selects the Discord Daily Content publisher only when a bot token is configured", () => {
    const runtime = createDailyContentPublisherRuntime({
      DAILY_CONTENT_PUBLISHER: "discord",
      DISCORD_BOT_TOKEN: "test-token"
    });

    expect(runtime.mode).toBe("discord");
    expect(runtime.publisher).toBeInstanceOf(DiscordDailyContentPublisher);
    expect(JSON.stringify(runtime.publisher)).not.toContain("test-token");
  });
});
