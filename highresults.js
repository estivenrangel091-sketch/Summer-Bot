const {
  SlashCommandBuilder,
  EmbedBuilder
} = require("discord.js");

const {
  MODE_KEYS,
  TIERS,
  modeInfo,
  getDB,
  saveDB,
  setCooldown,
  removeFromWaitlist
} = require("./botData");

module.exports = {

  data: new SlashCommandBuilder()
    .setName("highresult")
    .setDescription("Registra un resultado de High Test.")
    .addStringOption(option =>
      option
        .setName("player")
        .setDescription("Nombre de Minecraft del jugador.")
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName("mode")
        .setDescription("Modalidad.")
        .setRequired(true)
        .addChoices(
          ...MODE_KEYS.map(mode => ({
            name: modeInfo(mode).name,
            value: mode
          }))
        )
    )
    .addStringOption(option =>
      option
        .setName("tier")
        .setDescription("Tier obtenido.")
        .setRequired(true)
        .addChoices(
          ...TIERS.map(tier => ({
            name: tier,
            value: tier
          }))
        )
    ),

  async execute(interaction) {

    if (!interaction.memberPermissions?.has("ManageGuild")) {
      return interaction.reply({
        content: "❌ No tienes permiso para registrar resultados.",
        ephemeral: true
      });
    }

    const player = interaction.options.getString("player");
    const mode = interaction.options.getString("mode");
    const tier = interaction.options.getString("tier");

    const db = getDB();

    db.highResults ??= [];

    db.highResults.push({
      player,
      mode,
      tier,
      tester: interaction.user.id,
      timestamp: Date.now()
    });

    saveDB(db);

    const user = interaction.guild.members.cache.find(
      member =>
        member.user.username.toLowerCase() ===
        player.toLowerCase()
    );

    if (user) {
      removeFromWaitlist(
        db,
        user.id,
        mode
      );

      setCooldown(
        db,
        user.id,
        mode
      );
    }

    const embed = new EmbedBuilder()
      .setTitle("🔥 High Test Result")
      .setDescription(
        `**${player}** ha completado un High Test.`
      )
      .addFields(
        {
          name: "Modalidad",
          value: `${modeInfo(mode).emoji} ${modeInfo(mode).name}`,
          inline: true
        },
        {
          name: "Tier",
          value: `**${tier}**`,
          inline: true
        },
        {
          name: "Tester",
          value: `<@${interaction.user.id}>`,
          inline: true
        }
      )
      .setTimestamp();

    const config = require("./botData").getConfig();

    const channel =
      interaction.guild.channels.cache.get(
        config.channels?.highResults
      );

    if (channel) {
      await channel.send({
        embeds: [embed]
      });
    }

    await interaction.reply({
      content: `✅ High Result registrado: **${player} — ${modeInfo(mode).name} — ${tier}**`,
      ephemeral: true
    });
  }
};
