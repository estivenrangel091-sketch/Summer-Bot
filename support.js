const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

const {
  getConfig,
  saveConfig,
  MODE_KEYS,
  modeInfo
} = require("./botData");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setup")
    .setDescription("Crea toda la estructura de Summer Tier List.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const guild = interaction.guild;
    const config = getConfig();

    config.guildId = guild.id;

    async function ensureRole(name) {
      let role = guild.roles.cache.find(r => r.name === name);

      if (!role) {
        role = await guild.roles.create({
          name,
          reason: "Summer Tier List setup"
        });
      }

      return role;
    }

    const testerRole = await ensureRole("Summer Tester");
    const staffRole = await ensureRole("Summer Staff");
    const highStaffRole = await ensureRole("Summer High Staff");

    config.roles.tester = testerRole.id;
    config.roles.staff = staffRole.id;
    config.roles.highStaff = highStaffRole.id;

    let mainCategory = config.categoryId
      ? guild.channels.cache.get(config.categoryId)
      : null;

    if (!mainCategory || mainCategory.type !== ChannelType.GuildCategory) {
      mainCategory = await guild.channels.create({
        name: "☀️ SUMMER TIER LIST",
        type: ChannelType.GuildCategory
      });
    }

    config.categoryId = mainCategory.id;

    let ticketCategory = config.ticketCategoryId
      ? guild.channels.cache.get(config.ticketCategoryId)
      : null;

    if (!ticketCategory || ticketCategory.type !== ChannelType.GuildCategory) {
      ticketCategory = await guild.channels.create({
        name: "🎫 TICKETS",
        type: ChannelType.GuildCategory
      });
    }

    config.ticketCategoryId = ticketCategory.id;

    config.channels.waitlists ||= {};

    for (const mode of MODE_KEYS) {
      let channel = config.channels.waitlists[mode]
        ? guild.channels.cache.get(config.channels.waitlists[mode])
        : null;

      if (!channel) {
        channel = await guild.channels.create({
          name: `${mode}-waitlist`,
          type: ChannelType.GuildText,
          parent: mainCategory.id,
          topic: `☀️ ${modeInfo(mode).name} official testing waitlist`
        });
      }

      config.channels.waitlists[mode] = channel.id;
    }

    async function ensureChannel(key, name) {
      let channel = config.channels[key]
        ? guild.channels.cache.get(config.channels[key])
        : null;

      if (!channel) {
        channel = await guild.channels.create({
          name,
          type: ChannelType.GuildText,
          parent: mainCategory.id
        });
      }

      config.channels[key] = channel.id;
      return channel;
    }

    await ensureChannel("results", "results");
    await ensureChannel("highResults", "high-results");
    const support = await ensureChannel("support", "support");
    await ensureChannel("logs", "staff-logs");

    saveConfig(config);

    const messages = await support.messages.fetch({ limit: 50 }).catch(() => null);

    const existing = messages?.find(
      m =>
        m.author.id === interaction.client.user.id &&
        m.embeds[0]?.title === "☀️ SUMMER TIER LIST • SUPPORT"
    );

    const embed = new EmbedBuilder()
      .setColor(0x2f8cff)
      .setTitle("☀️ SUMMER TIER LIST • SUPPORT")
      .setDescription(
        "**SUPPORT CENTER**\n" +
        "━━━━━━━━━━━━━━━━━━━━\n\n" +
        "Need help? Open a private ticket.\n\n" +
        "🛡️ Support\n" +
        "🧪 Tester Application\n" +
        "👑 Staff Application\n" +
        "🔥 High Test\n" +
        "🎯 Test Issue\n" +
        "🏆 Result Issue\n" +
        "🧪 Tester Report\n" +
        "👤 Player Report\n" +
        "🛡️ Staff Report\n" +
        "⚙️ Technical"
      )
      .setFooter({
        text: "Summer Tier List • Official Support"
      });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("support:open")
        .setLabel("Open Ticket")
        .setEmoji("🎫")
        .setStyle(ButtonStyle.Primary)
    );

    if (existing) {
      await existing.edit({
        embeds: [embed],
        components: [row]
      });
    } else {
      await support.send({
        embeds: [embed],
        components: [row]
      });
    }

    await interaction.editReply(
      "☀️ **Summer Tier List configurado correctamente.**\n\n" +
      "✅ NetPot Waitlist\n" +
      "✅ UHC Waitlist\n" +
      "✅ Sword Waitlist\n" +
      "✅ BoxPvP Waitlist\n" +
      "✅ CrystalPvP Waitlist\n" +
      "✅ Support Panel\n" +
      "✅ Ticket Category\n" +
      "✅ Tester / Staff / High Staff\n" +
      "✅ Results\n" +
      "✅ High Results\n\n" +
      "🎫 Las aplicaciones se realizan dentro de los tickets."
    );
  }
};
