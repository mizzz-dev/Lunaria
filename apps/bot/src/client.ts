import {
  Client,
  Events,
  GatewayIntentBits,
  REST,
  type Interaction
} from "discord.js";
import { lunariaCommand } from "./commands/lunaria.js";
import {
  handleQuoteCardButtonInteraction,
  quoteCommand,
  handleQuoteReplyMessage,
  quoteMessageCommand
} from "./commands/quote.js";
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
    if (interaction.isMessageContextMenuCommand()) {
      if (interaction.commandName === quoteMessageCommand.data.name) {
        await quoteMessageCommand.execute(interaction);
      }
      return;
    }

    if (interaction.isButton() && (await handleQuoteCardButtonInteraction(interaction))) {
      return;
    }

    if (!interaction.isChatInputCommand()) {
      return;
    }

    if (interaction.commandName === lunariaCommand.data.name) {
      await lunariaCommand.execute(interaction);
    } else if (interaction.commandName === quoteCommand.data.name) {
      await quoteCommand.execute(interaction);
    }
  });

  client.on(Events.MessageCreate, async (message) => {
    try {
      if (await handleQuoteReplyMessage(message)) {
        return;
      }
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
