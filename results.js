const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("results")
    .setDescription("Muestra resultados oficiales.")
    .addUserOption(o => o.setName("user").setDescription("Jugador").setRequired(false))
    .addStringOption(o => o.setName("mode").setDescription("Modalidad").setRequired(false)
      .addChoices(
        {name:"NetPot",value:"netpot"},{name:"UHC",value:"uhc"},{name:"Sword",value:"sword"},
        {name:"BoxPvP",value:"boxpvp"},{name:"CrystalPvP",value:"crystalpvp"}
      )),
  async execute(interaction) {
    const { getDB, modeInfo } = require("../index");
    const db = getDB();
    const user = interaction.options.getUser("user");
    const mode = interaction.options.getString("mode");
    let rows = db.results;
    if (user) rows = rows.filter(x => x.userId === user.id);
    if (mode) rows = rows.filter(x => x.mode === mode);
    rows = rows.slice(-10).reverse();

    const text = rows.length ? rows.map(x =>
      `🏆 <@${x.userId}> — **${modeInfo(x.mode).name} ${x.tier}** • Tester: <@${x.testerId}>`
    ).join("\n") : "*No results found.*";

    const embed = new EmbedBuilder()
      .setColor(0x2f8cff)
      .setTitle("☀️ SUMMER TIER LIST")
      .setDescription(`**OFFICIAL RESULTS**\n━━━━━━━━━━━━━━━━━━━━\n\n${text}`)
      .setFooter({text:"Summer Tier List • Official Results"});
    await interaction.reply({embeds:[embed]});
  }
};
