const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("highresults")
    .setDescription("Muestra los resultados oficiales de High Test."),
  async execute(interaction) {
    const { getDB, modeInfo } = require("../index");
    const db = getDB();
    const rows = db.highResults.slice(-15).reverse();
    const text = rows.length ? rows.map(x =>
      `🔥 <@${x.userId}> — **${modeInfo(x.mode).name} ${x.tier}** • Tester: <@${x.testerId}>`
    ).join("\n") : "*No High Results found.*";

    const embed = new EmbedBuilder()
      .setColor(0xf5b642)
      .setTitle("☀️ SUMMER TIER LIST")
      .setDescription(`**HIGH RESULTS**\n━━━━━━━━━━━━━━━━━━━━\n\n${text}`)
      .setFooter({text:"High Test results are handled through Support."});
    await interaction.reply({embeds:[embed]});
  }
};
