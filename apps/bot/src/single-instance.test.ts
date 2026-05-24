import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { acquireSingleInstanceLock } from "./single-instance.js";

describe("single instance lock", () => {
  it("prevents the same bot process from acquiring the lock twice", () => {
    const directory = mkdtempSync(join(tmpdir(), "lunaria-bot-lock-"));
    const lockPath = join(directory, "bot.pid");
    const lock = acquireSingleInstanceLock(lockPath);

    expect(() => acquireSingleInstanceLock(lockPath)).toThrow(
      /already running/
    );

    lock.release();
    rmSync(directory, { recursive: true, force: true });
  });

  it("recovers stale lock files", () => {
    const directory = mkdtempSync(join(tmpdir(), "lunaria-bot-lock-"));
    const lockPath = join(directory, "bot.pid");
    writeFileSync(lockPath, "999999999");

    const lock = acquireSingleInstanceLock(lockPath);

    expect(lock.path).toBe(lockPath);
    lock.release();
    rmSync(directory, { recursive: true, force: true });
  });
});
