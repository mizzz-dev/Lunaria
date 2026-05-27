import {
  ChatInputCommandInteraction,
  MessageFlags,
  SlashCommandBuilder
} from "discord.js";

export const lunariaCommand = {
  data: new SlashCommandBuilder()
    .setName("lunaria")
    .setDescription("Lunaria bot utilities")
    .addSubcommand((subcommand) =>
      subcommand.setName("ping").setDescription("Check Lunaria latency")
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "ping") {
      await interaction.reply({
        content: "Lunaria is awake.",
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    await interaction.reply({
      content: "Unknown Lunaria command.",
      flags: MessageFlags.Ephemeral
    });
  }
};
