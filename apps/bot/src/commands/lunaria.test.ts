import { MessageFlags, type ChatInputCommandInteraction } from "discord.js";
import { describe, expect, it, vi } from "vitest";
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

  it("responds to ping privately using interaction flags", async () => {
    const reply = vi.fn();
    const interaction = {
      options: { getSubcommand: () => "ping" },
      reply
    } as unknown as ChatInputCommandInteraction;

    await lunariaCommand.execute(interaction);

    expect(reply).toHaveBeenCalledWith({
      content: "Lunaria is awake.",
      flags: MessageFlags.Ephemeral
    });
  });
});
