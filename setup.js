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
.setDescription("Crea y organiza toda la estructura de Summer Tier List.")
.setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

async execute(interaction) {
await interaction.deferReply({ ephemeral: true });

```
const guild = interaction.guild;

// ==========================================
// CATEGORÍA PRINCIPAL
// ==========================================

let mainCategory = guild.channels.cache.find(
  channel =>
    channel.type === ChannelType.GuildCategory &&
    channel.name === "☀️ SUMMER TIER LIST"
);

if (!mainCategory) {
  mainCategory = await guild.channels.create({
    name: "☀️ SUMMER TIER LIST",
    type: ChannelType.GuildCategory
  });
}

// ==========================================
// WAITLISTS
// ==========================================

const waitlists = {};

for (const mode of MODE_KEYS) {
  const info = modeInfo(mode);

  const emojiName = `${info.emoji}・${mode}-waitlist`;

  // Buscar tanto el nombre nuevo como el antiguo
  let channel = guild.channels.cache.find(
    c =>
      c.type === ChannelType.GuildText &&
      (
        c.name === emojiName ||
        c.name === `${mode}-waitlist`
      )
  );

  if (!channel) {
    channel = await guild.channels.create({
      name: emojiName,
      type: ChannelType.GuildText,
      parent: mainCategory.id
    });
  } else {
    // RENOMBRAR SI EXISTÍA SIN EMOJI
    if (channel.name !== emojiName) {
      await channel.setName(emojiName);
    }

    // Mover a la categoría correcta
    if (channel.parentId !== mainCategory.id) {
      await channel.setParent(mainCategory.id);
    }
  }

  waitlists[mode] = channel.id;

  // ==========================================
  // PANEL DE WAITLIST
  // ==========================================

  const messages = await channel.messages.fetch({
    limit: 50
  });

  const hasPanel = messages.some(
    message =>
      message.author.id === interaction.client.user.id &&
      message.embeds.length > 0 &&
      message.embeds[0].title?.includes("WAITLIST")
  );

  if (!hasPanel) {
    const embed = new EmbedBuilder()
      .setTitle(`${info.emoji} ${info.name} WAITLIST`)
      .setDescription(
        "Únete a la waitlist para realizar tu test.\n\n" +
        "Cuando un tester esté disponible, tu test será atendido."
      )
      .setFooter({
        text: "Summer Tier List"
      });

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`waitlist:join:${mode}`)
        .setLabel("Join")
        .setEmoji("➕")
        .setStyle(ButtonStyle.Success),

      new ButtonBuilder()
        .setCustomId(`waitlist:leave:${mode}`)
        .setLabel("Leave")
        .setEmoji("➖")
        .setStyle(ButtonStyle.Danger),

      new ButtonBuilder()
        .setCustomId(`waitlist:view:${mode}`)
        .setLabel("View Queue")
        .setEmoji("👥")
        .setStyle(ButtonStyle.Secondary)
    );

    await channel.send({
      embeds: [embed],
      components: [buttons]
    });
  }
}

// ==========================================
// CANALES GENERALES
// ==========================================

const generalChannels = {
  results: {
    name: "📊・results"
  },

  highResults: {
    name: "🏆・high-results"
  },

  support: {
    name: "🆘・support"
  },

  logs: {
    name: "📋・staff-logs"
  }
};

const channelIds = {};

for (const [key, data] of Object.entries(generalChannels)) {

  // Buscar nombre con emoji O nombre antiguo
  const oldName = key === "highResults"
    ? "high-results"
    : key === "results"
      ? "results"
      : key === "support"
        ? "support"
        : "staff-logs";

  let channel = guild.channels.cache.find(
    c =>
      c.type === ChannelType.GuildText &&
      (
        c.name === data.name ||
        c.name === oldName
      )
  );

  if (!channel) {
    channel = await guild.channels.create({
      name: data.name,
      type: ChannelType.GuildText,
      parent: mainCategory.id
    });
  } else {
    if (channel.name !== data.name) {
      await channel.setName(data.name);
    }

    if (channel.parentId !== mainCategory.id) {
      await channel.setParent(mainCategory.id);
    }
  }

  channelIds[key] = channel.id;
}

// ==========================================
// CATEGORÍA DE TICKETS
// ==========================================

let ticketCategory = guild.channels.cache.find(
  channel =>
    channel.type === ChannelType.GuildCategory &&
    channel.name === "🎫 TICKETS"
);

if (!ticketCategory) {
  ticketCategory = await guild.channels.create({
    name: "🎫 TICKETS",
    type: ChannelType.GuildCategory
  });
}

// ==========================================
// PANEL DE TICKETS
// ==========================================

let ticketPanel = guild.channels.cache.find(
  channel =>
    channel.type === ChannelType.GuildText &&
    (
      channel.name === "🎫・ticket-panel" ||
      channel.name === "ticket-panel"
    )
);

if (!ticketPanel) {
  ticketPanel = await guild.channels.create({
    name: "🎫・ticket-panel",
    type: ChannelType.GuildText,
    parent: ticketCategory.id
  });
} else {
  if (ticketPanel.name !== "🎫・ticket-panel") {
    await ticketPanel.setName("🎫・ticket-panel");
  }

  if (ticketPanel.parentId !== ticketCategory.id) {
    await ticketPanel.setParent(ticketCategory.id);
  }
}

const ticketMessages = await ticketPanel.messages.fetch({
  limit: 50
});

const hasTicketPanel = ticketMessages.some(
  message =>
    message.author.id === interaction.client.user.id &&
    message.embeds.length > 0 &&
    message.embeds[0].title?.includes("TICKETS")
);

if (!hasTicketPanel) {
  const embed = new EmbedBuilder()
    .setTitle("🎫 SUMMER TIER LIST — TICKETS")
    .setDescription(
      "Necesitas ayuda o quieres solicitar algo?\n\n" +
      "Pulsa **Open Ticket** y selecciona el tipo de ticket."
    )
    .setFooter({
      text: "Summer Tier List"
    });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("support:open")
      .setLabel("Open Ticket")
      .setEmoji("🎫")
      .setStyle(ButtonStyle.Primary)
  );

  await ticketPanel.send({
    embeds: [embed],
    components: [row]
  });
}

// ==========================================
// GUARDAR CONFIG
// ==========================================

const config = getConfig();

config.guildId = guild.id;
config.categoryId = mainCategory.id;
config.ticketCategoryId = ticketCategory.id;

config.channels.waitlists = waitlists;
config.channels.results = channelIds.results;
config.channels.highResults = channelIds.highResults;
config.channels.support = channelIds.support;
config.channels.logs = channelIds.logs;

config.ticketPanelId = ticketPanel.id;

saveConfig(config);

// ==========================================
// RESPUESTA
// ==========================================

await interaction.editReply(
  "☀️ **SUMMER TIER LIST — SETUP COMPLETADO**\n\n" +
  "🟠 NetPot Waitlist\n" +
  "🧪 UHC Waitlist\n" +
  "⚔️ Sword Waitlist\n" +
  "📦 BoxPvP Waitlist\n" +
  "💎 CrystalPvP Waitlist\n\n" +
  "📊 Results\n" +
  "🏆 High Results\n" +
  "🆘 Support\n" +
  "📋 Staff Logs\n\n" +
  "🎫 Ticket Panel\n\n" +
  "✅ Los canales existentes también fueron renombrados."
);
```

}
};
