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
.setDescription("Crea toda la estructura de Summer Tier List.")
.setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

async execute(interaction) {
await interaction.deferReply({ ephemeral: true });

```
const guild = interaction.guild;

// =========================
// CATEGORÍA PRINCIPAL
// =========================
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

// =========================
// WAITLISTS
// =========================
const waitlists = {};

for (const mode of MODE_KEYS) {
  const info = modeInfo(mode);
  const channelName = `${info.emoji}・${mode}-waitlist`;

  let channel = guild.channels.cache.find(
    c =>
      c.type === ChannelType.GuildText &&
      c.name === channelName
  );

  if (!channel) {
    channel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      parent: mainCategory.id
    });
  } else if (channel.parentId !== mainCategory.id) {
    await channel.setParent(mainCategory.id);
  }

  waitlists[mode] = channel.id;

  // Panel de waitlist
  const messages = await channel.messages.fetch({ limit: 20 });

  const alreadyHasPanel = messages.some(
    m => m.author.id === interaction.client.user.id &&
         m.embeds?.[0]?.title?.includes("WAITLIST")
  );

  if (!alreadyHasPanel) {
    const embed = new EmbedBuilder()
      .setTitle(`${info.emoji} ${info.name} WAITLIST`)
      .setDescription(
        "Únete a la lista para realizar tu test.\n\n" +
        "Cuando un tester esté disponible, se abrirá tu test manualmente."
      )
      .setFooter({
        text: "Summer Tier List"
      });

    const row = new ActionRowBuilder().addComponents(
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
      components: [row]
    });
  }
}

// =========================
// CANALES GENERALES
// =========================
const normalChannels = {
  results: "results",
  highResults: "high-results",
  support: "support",
  logs: "staff-logs"
};

const createdChannels = {};

for (const [key, name] of Object.entries(normalChannels)) {
  let channel = guild.channels.cache.find(
    c =>
      c.type === ChannelType.GuildText &&
      c.name === name
  );

  if (!channel) {
    channel = await guild.channels.create({
      name,
      type: ChannelType.GuildText,
      parent: mainCategory.id
    });
  } else if (channel.parentId !== mainCategory.id) {
    await channel.setParent(mainCategory.id);
  }

  createdChannels[key] = channel.id;
}

// =========================
// CATEGORÍA DE TICKETS
// =========================
let ticketCategory = guild.channels.cache.find(
  c =>
    c.type === ChannelType.GuildCategory &&
    c.name === "🎫 TICKETS"
);

if (!ticketCategory) {
  ticketCategory = await guild.channels.create({
    name: "🎫 TICKETS",
    type: ChannelType.GuildCategory
  });
}

// =========================
// PANEL DE TICKETS
// =========================
let ticketPanel = guild.channels.cache.find(
  c =>
    c.type === ChannelType.GuildText &&
    c.name === "ticket-panel"
);

if (!ticketPanel) {
  ticketPanel = await guild.channels.create({
    name: "ticket-panel",
    type: ChannelType.GuildText,
    parent: ticketCategory.id
  });
} else if (ticketPanel.parentId !== ticketCategory.id) {
  await ticketPanel.setParent(ticketCategory.id);
}

const panelMessages = await ticketPanel.messages.fetch({
  limit: 20
});

const hasTicketPanel = panelMessages.some(
  m =>
    m.author.id === interaction.client.user.id &&
    m.embeds?.[0]?.title?.includes("TICKETS")
);

if (!hasTicketPanel) {
  const embed = new EmbedBuilder()
    .setTitle("🎫 SUMMER TIER LIST — TICKETS")
    .setDescription(
      "¿Necesitas ayuda?\n\n" +
      "Pulsa el botón de abajo para abrir un ticket y selecciona el tipo de solicitud."
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

// =========================
// GUARDAR CONFIG
// =========================
const config = getConfig();

config.guildId = guild.id;
config.categoryId = mainCategory.id;
config.ticketCategoryId = ticketCategory.id;

config.channels.waitlists = waitlists;
config.channels.results = createdChannels.results;
config.channels.highResults = createdChannels.highResults;
config.channels.support = createdChannels.support;
config.channels.logs = createdChannels.logs;

config.ticketPanelId = ticketPanel.id;

saveConfig(config);

await interaction.editReply(
  "✅ **Setup completado.**\n\n" +
  "☀️ Summer Tier List creada.\n" +
  "🎫 Sistema de tickets creado.\n" +
  "📝 Waitlists creadas.\n" +
  "📊 Canales de resultados creados."
);
```

}
};
