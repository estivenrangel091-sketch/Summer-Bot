const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setup")
    .setDescription("Crea la estructura oficial de Summer Tier List.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const { setupGuild } = require("../index");
    const result = await setupGuild(interaction.guild);
    await interaction.editReply(result);
  }
};
