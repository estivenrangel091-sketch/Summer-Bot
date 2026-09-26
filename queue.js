const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("queue")
    .setDescription("Muestra una waitlist.")
    .addStringOption(o => o.setName("mode").setDescription("Modalidad").setRequired(true)
      .addChoices(
        {name:"NetPot",value:"netpot"},{name:"UHC",value:"uhc"},{name:"Sword",value:"sword"},
        {name:"BoxPvP",value:"boxpvp"},{name:"CrystalPvP",value:"crystalpvp"}
      )),
  async execute(interaction) {
    const mode = interaction.options.getString("mode");
    const { getDB, modeInfo } = require("../index");
    const db = getDB();
    const q = db.waitlists[mode] || [];
    const list = q.length ? q.map((id,i)=>`**${i+1}.** <@${id}>`).join("\n") : "*Empty.*";
    const embed = new EmbedBuilder().setColor(0x2f8cff)
      .setTitle(`☀️ ${modeInfo(mode).name.toUpperCase()} WAITLIST`)
      .setDescription(`**Players:** ${q.length}\n\n${list}`);
    await interaction.reply({embeds:[embed], ephemeral:true});
  }
};
