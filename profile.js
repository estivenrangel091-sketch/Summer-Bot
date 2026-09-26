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
    .setName("profile")
    .setDescription("Muestra el perfil PvP de un jugador.")

    .addUserOption(option =>
      option
        .setName("player")
        .setDescription("Jugador")
        .setRequired(false)
    ),

  async execute(interaction) {
    const player =
      interaction.options.getUser("player") ||
      interaction.user;

    const db = getDB();

    const results = db.results.filter(
      r => r.playerId === player.id
    );

    const highResults = db.highResults.filter(
      r => r.playerId === player.id
    );

    const normalText = results.length
      ? results
          .map(
            r =>
              `${modeInfo(r.mode).emoji} ${modeInfo(r.mode).name}: **${r.tier}**`
          )
          .join("\n")
      : "*No normal results.*";

    const highText = highResults.length
      ? highResults
          .map(
            r =>
              `${modeInfo(r.mode).emoji} ${modeInfo(r.mode).name}: **${r.tier}**`
          )
          .join("\n")
      : "*No High Results.*";

    const embed = new EmbedBuilder()
      .setColor(0x2f8cff)
      .setTitle(`☀️ ${player.username} • PROFILE`)
      .setThumbnail(player.displayAvatarURL())
      .addFields(
        {
          name: "🏆 Results",
          value: normalText
        },
        {
          name: "🔥 High Results",
          value: highText
        }
      );

    await interaction.reply({
      embeds: [embed]
    });
  }
};
