import { REST, Routes } from "discord.js";
import { commands } from "./commands/index.js";
import type { BotConfig } from "./config.js";

export async function registerGuildCommands(
  rest: REST,
  config: BotConfig
): Promise<void> {
  await rest.put(
    Routes.applicationGuildCommands(
      config.DISCORD_CLIENT_ID,
      config.PRIMARY_GUILD_ID
    ),
    {
      body: commands.map((command) => command.data.toJSON())
    }
  );
}

