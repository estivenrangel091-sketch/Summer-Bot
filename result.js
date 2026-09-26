const {
  SlashCommandBuilder,
  PermissionFlagsBits
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
    .setName("result")
    .setDescription("Registra un resultado normal.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)

    .addUserOption(option =>
      option
        .setName("player")
        .setDescription("Jugador testeado")
        .setRequired(true)
    )

    .addStringOption(option =>
      option
        .setName("mode")
        .setDescription("Modalidad")
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
        .setDescription("Tier obtenido")
        .setRequired(true)
        .addChoices(
          ...TIERS.map(tier => ({
            name: tier,
            value: tier
          }))
        )
    ),

  async execute(interaction) {
    const player = interaction.options.getUser("player");
    const mode = interaction.options.getString("mode");
    const tier = interaction.options.getString("tier");

    const db = getDB();

    db.results.push({
      playerId: player.id,
      mode,
      tier,
      testerId: interaction.user.id,
      createdAt: Date.now()
    });

    saveDB(db);

    removeFromWaitlist(player.id, mode);
    setCooldown(player.id, mode);

    await interaction.reply(
      `🏆 **Resultado registrado correctamente.**\n\n` +
      `👤 **Player:** ${player}\n` +
      `🎮 **Mode:** ${modeInfo(mode).name}\n` +
      `🏆 **Tier:** ${tier}\n\n` +
      `⏱️ Cooldown de **3 días** aplicado únicamente a ${modeInfo(mode).name}.`
    );
  }
};
