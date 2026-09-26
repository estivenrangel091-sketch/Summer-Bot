const {
  SlashCommandBuilder
} = require("discord.js");

const {
  MODE_KEYS,
  modeInfo,
  getDB
} = require("./botData");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("queue")
    .setDescription("Muestra una waitlist.")

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
    ),

  async execute(interaction) {
    const mode = interaction.options.getString("mode");

    const db = getDB();
    const queue = db.waitlists[mode] || [];

    if (!queue.length) {
      return interaction.reply(
        `📋 **${modeInfo(mode).name} Waitlist** está vacía.`
      );
    }

    await interaction.reply(
      `📋 **${modeInfo(mode).name} Waitlist**\n\n` +
      queue
        .map(
          (id, index) =>
            `**${index + 1}.** <@${id}>`
        )
        .join("\n")
    );
  }
};
