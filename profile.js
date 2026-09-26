const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder().setName("profile").setDescription("Muestra el perfil PvP.")
    .addUserOption(o=>o.setName("user").setDescription("Jugador").setRequired(false)),
  async execute(interaction) {
    const { getDB, modeInfo } = require("../index");
    const db = getDB();
    const user = interaction.options.getUser("user") || interaction.user;
    const results = db.results.filter(x=>x.userId===user.id);
    const highs = db.highResults.filter(x=>x.userId===user.id);
    const lines = Object.keys(require("../index").MODES).map(mode => {
      const r = results.filter(x=>x.mode===mode).slice(-1)[0];
      return `${modeInfo(mode).emoji} **${modeInfo(mode).name}:** ${r ? r.tier : "Unranked"}`;
    });
    const embed = new EmbedBuilder().setColor(0x2f8cff)
      .setTitle("☀️ SUMMER TIER LIST")
      .setDescription(
        `**PLAYER PROFILE**\n━━━━━━━━━━━━━━━━━━━━\n\n` +
        `👤 **Player:** <@${user.id}>\n\n${lines.join("\n")}\n\n` +
        `🏆 Results: **${results.length}**\n🔥 High Results: **${highs.length}**`
      );
    await interaction.reply({embeds:[embed]});
  }
};
