const {
  SlashCommandBuilder,
  ChannelType,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

const {
  MODE_KEYS,
  modeInfo,
  getConfig,
  saveConfig
} = require("./botData");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setup")
    .setDescription("Configura toda la estructura de Summer Tier List.")
    .setDefaultMemberPermissions(
      PermissionFlagsBits.Administrator
    ),

  async execute(interaction) {

    const guild = interaction.guild;

    await interaction.deferReply({
      ephemeral: true
    });

    const config = getConfig();

    config.guildId = guild.id;
    config.channels ??= {};
    config.channels.waitlists ??= {};
    config.roles ??= {};

    /* =========================
       ROLES
    ========================= */

    const roleNames = [
      "Summer Tester",
      "Summer Staff",
      "Summer High Staff"
    ];

    for (const name of roleNames) {

      let role = guild.roles.cache.find(
        r => r.name === name
      );

      if (!role) {
        role = await guild.roles.create({
          name,
          reason: "Summer Tier List setup"
        });
      }

      if (name === "Summer Tester")
        config.roles.tester = role.id;

      if (name === "Summer Staff")
        config.roles.staff = role.id;

      if (name === "Summer High Staff")
        config.roles.highStaff = role.id;
    }

    /* =========================
       MAIN CATEGORY
    ========================= */

    let mainCategory = guild.channels.cache.find(
      c =>
        c.type === ChannelType.GuildCategory &&
        c.name === "☀️ SUMMER TIER LIST"
    );

    if (!mainCategory) {

      mainCategory = await guild.channels.create({
        name: "☀️ SUMMER TIER LIST",
        type: ChannelType.GuildCategory
      });

    }

    config.categoryId = mainCategory.id;

    /* =========================
       WAITLISTS
    ========================= */

    for (const mode of MODE_KEYS) {

      const info = modeInfo(mode);

      const channelName =
        `${info.emoji}・${mode}-waitlist`;

      let channel =
        guild.channels.cache.get(
          config.channels.waitlists[mode]
        );

      if (
        !channel ||
        channel.type !== ChannelType.GuildText
      ) {

        channel = guild.channels.cache.find(
          c =>
            c.type === ChannelType.GuildText &&
            (
              c.name === `${mode}-waitlist` ||
              c.name === channelName
            )
        );

      }

      if (!channel) {

        channel = await guild.channels.create({
          name: channelName,
          type: ChannelType.GuildText,
          parent: mainCategory.id
        });

      } else {

        if (channel.parentId !== mainCategory.id) {
          await channel.setParent(
            mainCategory.id
          ).catch(() => {});
        }

        if (channel.name !== channelName) {
          await channel.setName(
            channelName
          ).catch(() => {});
        }

      }

      config.channels.waitlists[mode] =
        channel.id;
    }

    /* =========================
       RESULTS
    ========================= */

    let results =
      guild.channels.cache.get(
        config.channels.results
      );

    if (
      !results ||
      results.type !== ChannelType.GuildText
    ) {

      results = guild.channels.cache.find(
        c =>
          c.type === ChannelType.GuildText &&
          c.name === "results"
      );
    }

    if (!results) {

      results = await guild.channels.create({
        name: "results",
        type: ChannelType.GuildText,
        parent: mainCategory.id
      });

    }

    config.channels.results =
      results.id;

    /* =========================
       HIGH RESULTS
    ========================= */

    let highResults =
      guild.channels.cache.get(
        config.channels.highResults
      );

    if (
      !highResults ||
      highResults.type !== ChannelType.GuildText
    ) {

      highResults = guild.channels.cache.find(
        c =>
          c.type === ChannelType.GuildText &&
          c.name === "high-results"
      );
    }

    if (!highResults) {

      highResults = await guild.channels.create({
        name: "high-results",
        type: ChannelType.GuildText,
        parent: mainCategory.id
      });

    }

    config.channels.highResults =
      highResults.id;

    /* =========================
       SUPPORT
    ========================= */

    let support =
      guild.channels.cache.get(
        config.channels.support
      );

    if (
      !support ||
      support.type !== ChannelType.GuildText
    ) {

      support = guild.channels.cache.find(
        c =>
          c.type === ChannelType.GuildText &&
          c.name === "support"
      );
    }

    if (!support) {

      support = await guild.channels.create({
        name: "support",
        type: ChannelType.GuildText,
        parent: mainCategory.id
      });

    }

    config.channels.support =
      support.id;

    /* =========================
       STAFF LOGS
    ========================= */

    let logs =
      guild.channels.cache.get(
        config.channels.logs
      );

    if (
      !logs ||
      logs.type !== ChannelType.GuildText
    ) {

      logs = guild.channels.cache.find(
        c =>
          c.type === ChannelType.GuildText &&
          c.name === "staff-logs"
      );
    }

    if (!logs) {

      logs = await guild.channels.create({
        name: "staff-logs",
        type: ChannelType.GuildText,
        parent: mainCategory.id
      });

    }

    config.channels.logs =
      logs.id;

    /* =========================
       TICKET CATEGORY
    ========================= */

    let ticketCategory =
      guild.channels.cache.find(
        c =>
          c.type === ChannelType.GuildCategory &&
          c.name === "🎫 TICKETS"
      );

    if (!ticketCategory) {

      ticketCategory =
        await guild.channels.create({
          name: "🎫 TICKETS",
          type: ChannelType.GuildCategory
        });

    }

    config.ticketCategoryId =
      ticketCategory.id;

    /* =========================
       TICKET PANEL
    ========================= */

    let ticketPanel =
      guild.channels.cache.find(
        c =>
          c.type === ChannelType.GuildText &&
          c.name === "ticket-panel"
      );

    if (!ticketPanel) {

      ticketPanel =
        await guild.channels.create({
          name: "ticket-panel",
          type: ChannelType.GuildText,
          parent: ticketCategory.id,

          permissionOverwrites: [
            {
              id: guild.roles.everyone.id,

              allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.ReadMessageHistory
              ],

              deny: [
                PermissionFlagsBits.SendMessages
              ]
            }
          ]
        });

    } else {

      if (
        ticketPanel.parentId !==
        ticketCategory.id
      ) {

        await ticketPanel.setParent(
          ticketCategory.id
        ).catch(() => {});

      }

    }

    config.channels.ticketPanel =
      ticketPanel.id;

    /* =========================
       TICKET EMBED
    ========================= */

    const embed = new EmbedBuilder()
      .setTitle(
        "🎫 Summer Tier List — Tickets"
      )
      .setDescription(
        [
          "¿Necesitas ayuda o quieres realizar una solicitud?",
          "",
          "Pulsa **🎫 Open Ticket** para seleccionar el tipo de ticket.",
          "",
          "🛡️ **Support**",
          "Ayuda general, problemas o preguntas.",
          "",
          "🧪 **Tester Application**",
          "Solicita entrar al equipo de Testers.",
          "",
          "👑 **Staff Application**",
          "Solicita entrar al equipo de Staff.",
          "",
          "🔥 **High Test**",
          "Solicita un High Test.",
          "",
          "⚠️ No abras tickets innecesarios."
        ].join("\n")
      )
      .setColor(0xF1C40F)
      .setFooter({
        text: "Summer Tier List"
      });

    const button =
      new ButtonBuilder()
        .setCustomId("support:open")
        .setLabel("Open Ticket")
        .setEmoji("🎫")
        .setStyle(ButtonStyle.Primary);

    const row =
      new ActionRowBuilder()
        .addComponents(button);

    const messages =
      await ticketPanel.messages.fetch({
        limit: 20
      });

    const existingPanel =
      messages.find(
        message =>
          message.author.id ===
            interaction.client.user.id &&
          message.components.some(row =>
            row.components.some(
              component =>
                component.customId ===
                "support:open"
            )
          )
      );

    if (existingPanel) {

      await existingPanel.edit({
        embeds: [embed],
        components: [row]
      });

    } else {

      await ticketPanel.send({
        embeds: [embed],
        components: [row]
      });

    }

    /* =========================
       SAVE
    ========================= */

    saveConfig(config);

    await interaction.editReply({
      content:
        "✅ **Summer Tier List configurado correctamente.**\n\n" +
        "🟠 NetPot Waitlist\n" +
        "🧪 UHC Waitlist\n" +
        "⚔️ Sword Waitlist\n" +
        "📦 BoxPvP Waitlist\n" +
        "💎 CrystalPvP Waitlist\n\n" +
        "🎫 Ticket Panel creado."
    });
  }
};
