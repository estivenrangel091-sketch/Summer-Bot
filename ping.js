const { SlashCommandBuilder } = require("discord.js");
module.exports = {
  data: new SlashCommandBuilder().setName("ping").setDescription("Muestra la latencia."),
  async execute(interaction) { await interaction.reply(`🏓 Pong! ${interaction.client.ws.ping}ms`); }
};
