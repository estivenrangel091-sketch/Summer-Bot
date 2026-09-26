const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("result")
    .setDescription("Registra un resultado oficial.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addUserOption(o=>o.setName("user").setDescription("Jugador testeado").setRequired(true))
    .addStringOption(o=>o.setName("mode").setDescription("Modalidad").setRequired(true).addChoices(
      {name:"NetPot",value:"netpot"},{name:"UHC",value:"uhc"},{name:"Sword",value:"sword"},
      {name:"BoxPvP",value:"boxpvp"},{name:"CrystalPvP",value:"crystalpvp"}))
    .addStringOption(o=>o.setName("tier").setDescription("Tier").setRequired(true).addChoices(
      ...["HT1","LT1","HT2","LT2","HT3","LT3","HT4","LT4","HT5","LT5"].map(x=>({name:x,value:x}))))
    .addBooleanOption(o=>o.setName("high").setDescription("¿Es un High Test?").setRequired(true)),
  async execute(interaction){
    const {getDB,saveDB,getConfig,modeInfo}=require("../index");
    const user=interaction.options.getUser("user"), mode=interaction.options.getString("mode");
    const tier=interaction.options.getString("tier"), high=interaction.options.getBoolean("high");
    if(high && !interaction.channel.name.startsWith("high-") && !interaction.channel.name.startsWith("high"))
      return interaction.reply({content:"🔥 Un High Result debe registrarse desde un ticket High Test creado en Support.",ephemeral:true});

    const db=getDB();
    const result={userId:user.id,mode,tier,testerId:interaction.user.id,createdAt:Date.now(),channelId:interaction.channel.id};
    if(high) db.highResults.push(result); else db.results.push(result);

    // Only completed tests activate a cooldown. Closing a ticket does not.
    db.cooldowns[`${user.id}:${mode}`]=Date.now()+3*24*60*60*1000;
    db.waitlists[mode]=(db.waitlists[mode]||[]).filter(id=>id!==user.id);
    saveDB(db);

    const config=getConfig();
    const channelId=high?config.channels.highResults:config.channels.results;
    const ch=channelId?interaction.guild.channels.cache.get(channelId):null;
    if(ch) await ch.send({
      embeds:[new (require("discord.js").EmbedBuilder)().setColor(high?0xf5b642:0x2f8cff)
        .setTitle("☀️ SUMMER TIER LIST")
        .setDescription(`${high?"🔥 **HIGH RESULT**":"🏆 **OFFICIAL RESULT**"}\n━━━━━━━━━━━━━━━━━━━━\n\n`+
          `👤 **Player:** <@${user.id}>\n🎮 **Mode:** ${modeInfo(mode).name}\n🏅 **Tier:** **${tier}**\n🧪 **Tester:** <@${interaction.user.id}>`)
        .setFooter({text:"Summer Tier List • Official Result"}).setTimestamp()]
    });
    await interaction.reply(`✅ Resultado registrado: **${modeInfo(mode).name} ${tier}**.`);
  }
};
