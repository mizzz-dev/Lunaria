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
    expect(hasPermission(viewer, "quotes:create")).toBe(false);
  });

  it("allows moderators to register and manage quotes", () => {
    const moderator = {
      guildId: "guild-1",
      userId: "moderator-1",
      roleKeys: ["moderator"] as const
    };

    expect(hasPermission(moderator, "quotes:create")).toBe(true);
    expect(hasPermission(moderator, "quotes:manage")).toBe(true);
  });
});
