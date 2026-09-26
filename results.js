const {
  SlashCommandBuilder,
  EmbedBuilder
} = require("discord.js");

const {
  getDB,
  modeInfo
} = require("./botData");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("results")
    .setDescription("Muestra los resultados recientes."),

  async execute(interaction) {
    const db = getDB();

    const normal = db.results.slice(-10).reverse();
    const high = db.highResults.slice(-10).reverse();

    const embed = new EmbedBuilder()
      .setColor(0x2f8cff)
      .setTitle("☀️ SUMMER TIER LIST • RESULTS");

    embed.addFields({
      name: "🏆 Normal Results",
      value: normal.length
        ? normal
            .map(
              r =>
                `<@${r.playerId}> • ${modeInfo(r.mode).name} • **${r.tier}**`
            )
            .join("\n")
        : "*No results yet.*"
    });

    embed.addFields({
      name: "🔥 High Results",
      value: high.length
        ? high
            .map(
              r =>
                `<@${r.playerId}> • ${modeInfo(r.mode).name} • **${r.tier}**`
            )
            .join("\n")
        : "*No High Results yet.*"
    });

    await interaction.reply({
      embeds: [embed]
    });
  }
};
