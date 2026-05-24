import { describe, expect, it } from "vitest";
import { buildApi } from "./app.js";

describe("api health", () => {
  it("returns a healthy response", async () => {
    const app = buildApi();

    const response = await app.inject({
      method: "GET",
      url: "/health"
    });

    await app.close();

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      ok: true,
      service: "api"
    });
  });
});

