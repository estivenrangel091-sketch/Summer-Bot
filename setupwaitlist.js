const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

const {
  MODE_KEYS,
  modeInfo,
  getConfig
} = require("./botData");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setupwaitlist")
    .setDescription("Publica las waitlists oficiales.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const config = getConfig();

    for (const mode of MODE_KEYS) {
      const channelId = config.channels.waitlists?.[mode];

      if (!channelId) continue;

      const channel = interaction.guild.channels.cache.get(channelId);

      if (!channel) continue;

      const info = modeInfo(mode);

      const embed = new EmbedBuilder()
        .setColor(0x2f8cff)
        .setTitle(
          `☀️ SUMMER TIER LIST • ${info.name.toUpperCase()}`
        )
        .setDescription(
          `${info.emoji} **${info.name} WAITLIST**\n\n` +
          `Official ${info.name} testing queue.\n\n` +
          `👥 Players waiting: **0**\n` +
          `🟢 Status: **OPEN**`
        )
        .setFooter({
          text: "Summer Tier List • Official Testing"
        });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`waitlist:join:${mode}`)
          .setLabel("Join Waitlist")
          .setEmoji("➕")
          .setStyle(ButtonStyle.Success),

        new ButtonBuilder()
          .setCustomId(`waitlist:leave:${mode}`)
          .setLabel("Leave Waitlist")
          .setEmoji("➖")
          .setStyle(ButtonStyle.Danger),

        new ButtonBuilder()
          .setCustomId(`waitlist:view:${mode}`)
          .setLabel("View Queue")
          .setEmoji("📋")
          .setStyle(ButtonStyle.Secondary)
      );

      await channel.send({
        embeds: [embed],
        components: [row]
      });
    }

    await interaction.reply({
      content: "✅ Las 5 waitlists fueron configuradas.",
      ephemeral: true
    });
  }
};
