import { describe, expect, it } from "vitest";
import { lunariaCommand } from "./lunaria.js";

describe("lunaria command", () => {
  it("defines the /lunaria ping subcommand", () => {
    const commandJson = lunariaCommand.data.toJSON();

    expect(commandJson.name).toBe("lunaria");
    expect(commandJson.options).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "ping"
        })
      ])
    );
  });
});

