import {
  Client,
  Events,
  GatewayIntentBits,
  REST,
  type Interaction
} from "discord.js";
import { commands } from "./commands/index.js";
import type { BotConfig } from "./config.js";
import { handleMessageCreate } from "./message-rules.js";
import { registerGuildCommands } from "./register-guild-commands.js";

export function buildBotClient(): Client {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent
    ]
  });

  client.once(Events.ClientReady, (readyClient) => {
    console.log(`Lunaria bot ready as ${readyClient.user.tag}`);
  });

  client.on(Events.InteractionCreate, async (interaction: Interaction) => {
    if (!interaction.isChatInputCommand()) {
      return;
    }

    const command = commands.find(
      (candidate) => candidate.data.name === interaction.commandName
    );

    if (!command) {
      return;
    }

    await command.execute(interaction);
  });

  client.on(Events.MessageCreate, async (message) => {
    try {
      await handleMessageCreate(message);
    } catch (error) {
      console.error("Failed to handle messageCreate rule workflow", error);
    }
  });

  return client;
}

export async function startBot(config: BotConfig): Promise<Client> {
  const rest = new REST({ version: "10" }).setToken(config.DISCORD_BOT_TOKEN);
  await registerGuildCommands(rest, config);

  const client = buildBotClient();
  await client.login(config.DISCORD_BOT_TOKEN);
  return client;
}
