const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder().setName("cooldown").setDescription("Muestra tus cooldowns."),
  async execute(interaction) {
    const { getDB, modeInfo } = require("../index");
    const db = getDB();
    const now = Date.now();
    const lines = Object.keys(require("../index").MODES).map(mode => {
      const key = `${interaction.user.id}:${mode}`;
      const end = db.cooldowns[key] || 0;
      const remaining = Math.max(0, end-now);
      if (!remaining) return `🟢 **${modeInfo(mode).name}:** Available`;
      const d = Math.floor(remaining/86400000);
      const h = Math.floor((remaining%86400000)/3600000);
      return `🔴 **${modeInfo(mode).name}:** ${d}d ${h}h`;
    });
    await interaction.reply({embeds:[new EmbedBuilder().setColor(0x2f8cff)
      .setTitle("☀️ SUMMER TIER LIST")
      .setDescription(`**YOUR COOLDOWNS**\n━━━━━━━━━━━━━━━━━━━━\n\n${lines.join("\n")}`)]});
  }
};
