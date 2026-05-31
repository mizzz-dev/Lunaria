import { describe, expect, it, vi } from "vitest";
import { closeDailyContentQueueResources } from "./daily-content-runtime.js";

describe("Daily Content queue runtime", () => {
  it("closes worker runtime resources in order for graceful shutdown", async () => {
    const closed: string[] = [];
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

    await closeDailyContentQueueResources([worker, queue]);

    expect(closed).toEqual(["worker", "queue"]);
    expect(worker.close).toHaveBeenCalledOnce();
    expect(queue.close).toHaveBeenCalledOnce();
  });
});
