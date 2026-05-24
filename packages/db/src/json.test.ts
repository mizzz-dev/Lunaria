import { describe, expect, it } from "vitest";
import { toJsonObject } from "./json.js";

describe("DB JSON helpers", () => {
  it("keeps object values as JSON objects", () => {
    expect(toJsonObject({ enabled: true })).toEqual({ enabled: true });
  });

  it("normalizes non-object values to empty objects", () => {
    expect(toJsonObject(null)).toEqual({});
    expect(toJsonObject(["unexpected"])).toEqual({});
    expect(toJsonObject("unexpected")).toEqual({});
  });
});
