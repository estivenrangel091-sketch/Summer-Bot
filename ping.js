const {
  SlashCommandBuilder
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Comprueba si el bot está funcionando."),

  async execute(interaction) {

    await interaction.reply({
      content: `🏓 Pong! **${interaction.client.ws.ping}ms**`
    });

  }
};
