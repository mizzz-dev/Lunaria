import { describe, expect, it } from "vitest";
import { InMemoryAuditLogStore } from "./audit.js";

describe("InMemoryAuditLogStore", () => {
  it("returns latest guild events first and applies the limit", async () => {
    const store = new InMemoryAuditLogStore();
    const record = {
      guildId: "guild-1",
      pluginId: "autoresponse",
      actorUserId: "user-1",
      data: {}
    };

    await store.append({ ...record, type: "first" });
    await store.append({ ...record, type: "second" });
    await store.append({ ...record, guildId: "guild-2", type: "other-guild" });

    const logs = await store.listByGuild("guild-1", 1);

    expect(logs.map((log) => log.type)).toEqual(["second"]);
  });
});
