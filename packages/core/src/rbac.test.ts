import { describe, expect, it } from "vitest";
import { hasPermission } from "./rbac.js";

describe("RBAC", () => {
  it("grants owner wildcard permissions", () => {
    expect(
      hasPermission(
        {
          guildId: "guild-1",
          userId: "owner-1",
          roleKeys: ["owner"]
        },
        "server-ops:dangerous-action"
      )
    ).toBe(true);
  });

  it("keeps viewer read-only by default", () => {
    const viewer = {
      guildId: "guild-1",
      userId: "viewer-1",
      roleKeys: ["viewer"] as const
    };

    expect(hasPermission(viewer, "dashboard:read")).toBe(true);
    expect(hasPermission(viewer, "plugins:write")).toBe(false);
  });
});
