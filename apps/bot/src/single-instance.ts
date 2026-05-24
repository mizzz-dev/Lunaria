import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync
} from "node:fs";
import { dirname } from "node:path";

export interface SingleInstanceLock {
  readonly path: string;
  release(): void;
}

export function acquireSingleInstanceLock(lockFilePath: string): SingleInstanceLock {
  mkdirSync(dirname(lockFilePath), { recursive: true });

  if (existsSync(lockFilePath)) {
    const existingPid = Number(readFileSync(lockFilePath, "utf8"));

    if (Number.isInteger(existingPid) && existingPid > 0 && isProcessRunning(existingPid)) {
      throw new Error(`Lunaria bot is already running with PID ${existingPid}`);
    }

    rmSync(lockFilePath, { force: true });
  }

  writeFileSync(lockFilePath, String(process.pid), { flag: "wx" });

  const lock: SingleInstanceLock = {
    path: lockFilePath,
    release() {
      releaseLock(lockFilePath);
    }
  };

  process.once("exit", lock.release);

  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.once(signal, () => {
      lock.release();
      process.exit(0);
    });
  }

  return lock;
}

function isProcessRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function releaseLock(lockFilePath: string): void {
  if (!existsSync(lockFilePath)) {
    return;
  }

  const existingPid = Number(readFileSync(lockFilePath, "utf8"));

  if (existingPid === process.pid) {
    rmSync(lockFilePath, { force: true });
  }
}
