const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("support")
    .setDescription("Abre el centro oficial de soporte."),
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor(0x2f8cff)
      .setTitle("☀️ SUMMER TIER LIST")
      .setDescription(
        "**SUPPORT CENTER**\n━━━━━━━━━━━━━━━━━━━━\n\n" +
        "Necesitas ayuda? Selecciona una categoría.\n\n" +
        "🎯 **Test Issue** — problemas con un test\n" +
        "🏆 **Result Issue** — problemas con un resultado\n" +
        "🔥 **High Test** — solicitar un High Test\n" +
        "🧪 **Tester Report** — reportar un tester\n" +
        "👤 **Player Report** — reportar un jugador\n" +
        "🛡️ **Staff Report** — asuntos de staff\n" +
        "⚙️ **Technical** — problemas técnicos"
      )
      .setFooter({text:"Summer Tier List • Support"});

    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("support:test").setLabel("Test Issue").setEmoji("🎯").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("support:result").setLabel("Result Issue").setEmoji("🏆").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("support:high").setLabel("High Test").setEmoji("🔥").setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId("support:tester").setLabel("Tester Report").setEmoji("🧪").setStyle(ButtonStyle.Secondary)
    );
    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("support:player").setLabel("Player Report").setEmoji("👤").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("support:staff").setLabel("Staff Report").setEmoji("🛡️").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("support:technical").setLabel("Technical").setEmoji("⚙️").setStyle(ButtonStyle.Secondary)
    );
    await interaction.reply({embeds:[embed], components:[row1,row2]});
  }
};
