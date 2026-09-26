const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setupwaitlist")
    .setDescription("Recrea los paneles de las cinco waitlists.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const { refreshAllWaitlists } = require("../index");
    await refreshAllWaitlists(interaction.guild);
    await interaction.editReply("☀️ Paneles de waitlist actualizados.");
  }
};
