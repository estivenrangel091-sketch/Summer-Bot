require("dotenv").config();

const fs = require("fs");
const path = require("path");

const {
  Client,
  GatewayIntentBits,
  PermissionFlagsBits,
  ChannelType,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  SlashCommandBuilder,
  REST,
  Routes
} = require("discord.js");

// ======================================================
// CONFIG
// ======================================================

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

if (!TOKEN || !CLIENT_ID || !GUILD_ID) {
  console.error("❌ Faltan DISCORD_TOKEN, CLIENT_ID o GUILD_ID en las variables.");
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

const DATABASE_FILE = path.join(__dirname, "database.json");

const COOLDOWN_TIME = 3 * 24 * 60 * 60 * 1000;

// ======================================================
// MODALIDADES
// ======================================================

const MODES = {
  netpot: {
    name: "NetPot",
    emoji: "🟠"
  },
  uhc: {
    name: "UHC",
    emoji: "🧪"
  },
  sword: {
    name: "Sword",
    emoji: "⚔️"
  },
  boxpvp: {
    name: "BoxPvP",
    emoji: "📦"
  },
  crystalpvp: {
    name: "CrystalPvP",
    emoji: "💎"
  }
};

const MODE_KEYS = Object.keys(MODES);

const TIERS = [
  "HT1",
  "LT1",
  "HT2",
  "LT2",
  "HT3",
  "LT3",
  "HT4",
  "LT4",
  "HT5",
  "LT5"
];

// ======================================================
// ROLES
// ======================================================

const STAFF_ROLES = [
  "👑 Owner",
  "🛡️ Administrator",
  "🔨 Moderator",
  "🛠️ Helper",
  "💎 Tierlist Manager",
  "🏆 High Tester",
  "🧪 Senior Tester",
  "⚔️ Tester",
  "📋 Trial Tester",
  "🎫 Support",
  "🧑‍💻 Developer",
  "🤝 Partner",
  "📝 Staff Applicant"
];

const REGION_ROLES = [
  "🇺🇸 North America",
  "🇪🇺 Europe",
  "🇧🇷 South America",
  "🌏 Asia",
  "🇦🇺 Oceania",
  "🌍 Other"
];

const PING_ROLES = [
  "📢 Announcements",
  "🧪 Testing",
  "🏆 Results",
  "🎫 Support",
  "🎬 Media",
  "🏅 Events"
];

const MODE_ROLES = [
  "🟠 NetPot",
  "🧪 UHC",
  "⚔️ Sword",
  "📦 BoxPvP",
  "💎 CrystalPvP"
];

const TESTER_MODE_ROLES = [
  "🟠 Tester • NetPot",
  "🧪 Tester • UHC",
  "⚔️ Tester • Sword",
  "📦 Tester • BoxPvP",
  "💎 Tester • CrystalPvP"
];

// ======================================================
// DATABASE
// ======================================================

function defaultDatabase() {
  return {
    waitlists: {
      netpot: [],
      uhc: [],
      sword: [],
      boxpvp: [],
      crystalpvp: []
    },

    waitlistStatus: {
      netpot: true,
      uhc: true,
      sword: true,
      boxpvp: true,
      crystalpvp: true
    },

    cooldowns: {},
    profiles: {},
    results: [],
    highResults: [],
    tickets: [],
    applications: [],

    testers: {
      netpot: [],
      uhc: [],
      sword: [],
      boxpvp: [],
      crystalpvp: []
    },

    setupChannels: {}
  };
}

function loadDB() {
  if (!fs.existsSync(DATABASE_FILE)) {
    const db = defaultDatabase();
    fs.writeFileSync(
      DATABASE_FILE,
      JSON.stringify(db, null, 2)
    );
    return db;
  }

  try {
    const db = JSON.parse(
      fs.readFileSync(DATABASE_FILE, "utf8")
    );

    const defaults = defaultDatabase();

    for (const key of Object.keys(defaults)) {
      if (db[key] === undefined) {
        db[key] = defaults[key];
      }
    }

    for (const mode of MODE_KEYS) {
      if (!Array.isArray(db.waitlists[mode])) {
        db.waitlists[mode] = [];
      }

      if (db.waitlistStatus[mode] === undefined) {
        db.waitlistStatus[mode] = true;
      }

      if (!Array.isArray(db.testers[mode])) {
        db.testers[mode] = [];
      }
    }

    return db;
  } catch (error) {
    console.error("❌ Error leyendo database.json:", error);

    const db = defaultDatabase();

    fs.writeFileSync(
      DATABASE_FILE,
      JSON.stringify(db, null, 2)
    );

    return db;
  }
}

let db = loadDB();

function saveDB() {
  fs.writeFileSync(
    DATABASE_FILE,
    JSON.stringify(db, null, 2)
  );
}

// ======================================================
// HELPERS
// ======================================================

function getMode(mode) {
  return MODES[mode];
}

function getCooldownKey(userId, mode) {
  return `${userId}:${mode}`;
}

function getCooldown(userId, mode) {
  return db.cooldowns[getCooldownKey(userId, mode)] || null;
}

function setCooldown(userId, mode) {
  db.cooldowns[getCooldownKey(userId, mode)] =
    Date.now() + COOLDOWN_TIME;

  saveDB();
}

function removeCooldown(userId, mode) {
  delete db.cooldowns[getCooldownKey(userId, mode)];
  saveDB();
}

function hasActiveCooldown(userId, mode) {
  const cooldown = getCooldown(userId, mode);

  if (!cooldown) return false;

  if (Date.now() >= cooldown) {
    removeCooldown(userId, mode);
    return false;
  }

  return true;
}

function cooldownRemaining(userId, mode) {
  const cooldown = getCooldown(userId, mode);

  if (!cooldown) return 0;

  return Math.max(0, cooldown - Date.now());
}

function formatDuration(ms) {
  const totalSeconds = Math.ceil(ms / 1000);

  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  return `${days}d ${hours}h ${minutes}m`;
}

function hasRole(member, roleName) {
  if (!member) return false;

  if (
    member.permissions &&
    member.permissions.has(PermissionFlagsBits.Administrator)
  ) {
    return true;
  }

  return member.roles.cache.some(
    role => role.name === roleName
  );
}

function isOwner(member) {
  return hasRole(member, "👑 Owner");
}

function isAdmin(member) {
  return (
    isOwner(member) ||
    hasRole(member, "🛡️ Administrator")
  );
}

function isStaff(member) {
  if (!member) return false;

  if (
    member.permissions &&
    member.permissions.has(PermissionFlagsBits.Administrator)
  ) {
    return true;
  }

  return STAFF_ROLES.some(role =>
    member.roles.cache.some(r => r.name === role)
  );
}

function canManageWaitlist(member) {
  return (
    isAdmin(member) ||
    hasRole(member, "💎 Tierlist Manager") ||
    hasRole(member, "🏆 High Tester") ||
    hasRole(member, "🧪 Senior Tester") ||
    hasRole(member, "⚔️ Tester")
  );
}

function canRemoveCooldown(member) {
  return (
    isAdmin(member) ||
    hasRole(member, "💎 Tierlist Manager") ||
    hasRole(member, "🏆 High Tester") ||
    hasRole(member, "🧪 Senior Tester") ||
    hasRole(member, "⚔️ Tester") ||
    hasRole(member, "🛠️ Helper")
  );
}

function canResult(member, mode) {
  if (!member) return false;

  if (
    member.permissions &&
    member.permissions.has(PermissionFlagsBits.Administrator)
  ) {
    return true;
  }

  if (
    isOwner(member) ||
    hasRole(member, "🛡️ Administrator") ||
    hasRole(member, "💎 Tierlist Manager") ||
    hasRole(member, "🏆 High Tester") ||
    hasRole(member, "🧪 Senior Tester")
  ) {
    return true;
  }

  return db.testers[mode]?.includes(member.id);
}

function canHighResult(member) {
  return (
    isAdmin(member) ||
    hasRole(member, "💎 Tierlist Manager") ||
    hasRole(member, "🏆 High Tester")
  );
}

function getRole(guild, roleName) {
  return guild.roles.cache.find(
    role => role.name === roleName
  );
}

async function getOrCreateRole(guild, roleName, options = {}) {
  let role = getRole(guild, roleName);

  if (role) return role;

  role = await guild.roles.create({
    name: roleName,
    color: options.color || "Grey",
    hoist: options.hoist || false,
    mentionable: options.mentionable || false,
    reason: "Summer Tier List setup"
  });

  return role;
}

function getChannel(guild, name) {
  return guild.channels.cache.find(
    channel => channel.name === name
  );
}

async function getOrCreateCategory(guild, name) {
  let category = getChannel(guild, name);

  if (
    category &&
    category.type === ChannelType.GuildCategory
  ) {
    return category;
  }

  return guild.channels.create({
    name,
    type: ChannelType.GuildCategory
  });
}

async function getOrCreateTextChannel(
  guild,
  name,
  parent = null
) {
  let channel = getChannel(guild, name);

  if (
    channel &&
    channel.type === ChannelType.GuildText
  ) {
    if (parent && channel.parentId !== parent.id) {
      await channel.setParent(parent.id);
    }

    return channel;
  }

  return guild.channels.create({
    name,
    type: ChannelType.GuildText,
    parent: parent?.id || null
  });
}

// ======================================================
// ROLE SETUP
// ======================================================

async function createAllRoles(guild) {
  for (const role of STAFF_ROLES) {
    await getOrCreateRole(guild, role);
  }

  for (const role of REGION_ROLES) {
    await getOrCreateRole(guild, role);
  }

  for (const role of PING_ROLES) {
    await getOrCreateRole(guild, role);
  }

  for (const role of MODE_ROLES) {
    await getOrCreateRole(guild, role);
  }

  for (const role of TESTER_MODE_ROLES) {
    await getOrCreateRole(guild, role);
  }

  for (const mode of MODE_KEYS) {
    for (const tier of TIERS) {
      await getOrCreateRole(
        guild,
        `${MODES[mode].emoji} ${MODES[mode].name} ${tier}`
      );
    }
  }
}

// ======================================================
// STAFF PERMISSIONS
// ======================================================

async function configureStaffRoles(guild) {
  const permissions = {};

  permissions["👑 Owner"] = [
    PermissionFlagsBits.Administrator
  ];

  permissions["🛡️ Administrator"] = [
    PermissionFlagsBits.Administrator
  ];

  permissions["💎 Tierlist Manager"] = [
    PermissionFlagsBits.ManageGuild,
    PermissionFlagsBits.ManageChannels,
    PermissionFlagsBits.ManageMessages,
    PermissionFlagsBits.ViewAuditLog
  ];

  permissions["🔨 Moderator"] = [
    PermissionFlagsBits.KickMembers,
    PermissionFlagsBits.BanMembers,
    PermissionFlagsBits.ModerateMembers,
    PermissionFlagsBits.ManageMessages,
    PermissionFlagsBits.ViewAuditLog
  ];

  permissions["🏆 High Tester"] = [
    PermissionFlagsBits.ViewChannel
  ];

  permissions["🧪 Senior Tester"] = [
    PermissionFlagsBits.ViewChannel
  ];

  permissions["⚔️ Tester"] = [
    PermissionFlagsBits.ViewChannel
  ];

  permissions["📋 Trial Tester"] = [
    PermissionFlagsBits.ViewChannel
  ];

  permissions["🛠️ Helper"] = [
    PermissionFlagsBits.ViewChannel,
    PermissionFlagsBits.ManageMessages
  ];

  permissions["🎫 Support"] = [
    PermissionFlagsBits.ViewChannel,
    PermissionFlagsBits.SendMessages
  ];

  permissions["🧑‍💻 Developer"] = [
    PermissionFlagsBits.ViewChannel
  ];

  permissions["🤝 Partner"] = [
    PermissionFlagsBits.ViewChannel
  ];

  permissions["📝 Staff Applicant"] = [
    PermissionFlagsBits.ViewChannel
  ];

  for (const [roleName, perms] of Object.entries(permissions)) {
    const role = getRole(guild, roleName);

    if (!role) continue;

    try {
      await role.setPermissions(perms);
    } catch (error) {
      console.error(
        `❌ No se pudieron configurar permisos de ${roleName}:`,
        error.message
      );
    }
  }
}

// ======================================================
// CHANNEL PERMISSIONS
// ======================================================

async function configureChannelPermissions(guild) {
  const everyone = guild.roles.everyone;

  const owner = getRole(guild, "👑 Owner");
  const admin = getRole(guild, "🛡️ Administrator");
  const manager = getRole(guild, "💎 Tierlist Manager");

  const publicWriteChannels = [
    "📢・announcements",
    "📊・results",
    "🏆・high-results"
  ];

  // Público: todos ven, nadie escribe.
  // Owner/Admin/Manager pueden escribir.
  for (const channelName of publicWriteChannels) {
    const channel = getChannel(guild, channelName);

    if (!channel) continue;

    await channel.permissionOverwrites.edit(everyone, {
      ViewChannel: true,
      SendMessages: false,
      AddReactions: true,
      ReadMessageHistory: true
    });

    if (owner) {
      await channel.permissionOverwrites.edit(owner, {
        ViewChannel: true,
        SendMessages: true,
        ManageMessages: true
      });
    }

    if (admin) {
      await channel.permissionOverwrites.edit(admin, {
        ViewChannel: true,
        SendMessages: true,
        ManageMessages: true
      });
    }

    if (manager) {
      await channel.permissionOverwrites.edit(manager, {
        ViewChannel: true,
        SendMessages: true,
        ManageMessages: true
      });
    }
  }

  // Staff only
  const staffOnlyChannels = [
    "📋・staff-logs",
    "💬・staff-chat",
    "📁・applications"
  ];

  for (const channelName of staffOnlyChannels) {
    const channel = getChannel(guild, channelName);

    if (!channel) continue;

    await channel.permissionOverwrites.edit(everyone, {
      ViewChannel: false
    });

    for (const roleName of STAFF_ROLES) {
      const role = getRole(guild, roleName);

      if (!role) continue;

      await channel.permissionOverwrites.edit(role, {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true
      });
    }
  }

  // Ticket panel público
  const ticketPanel = getChannel(
    guild,
    "🎫・ticket-panel"
  );

  if (ticketPanel) {
    await ticketPanel.permissionOverwrites.edit(everyone, {
      ViewChannel: true,
      SendMessages: false,
      ReadMessageHistory: true
    });
  }

  // Información pública
  const informationChannels = [
    "📜・rules",
    "📖・how-to-play",
    "🏆・tier-list"
  ];

  for (const channelName of informationChannels) {
    const channel = getChannel(guild, channelName);

    if (!channel) continue;

    await channel.permissionOverwrites.edit(everyone, {
      ViewChannel: true,
      SendMessages: false,
      ReadMessageHistory: true
    });
  }

  // Media pública
  const mediaChannels = [
    "📸・screenshots",
    "🎥・clips",
    "🏅・highlights",
    "🖼️・media",
    "🎨・community-creations"
  ];

  for (const channelName of mediaChannels) {
    const channel = getChannel(guild, channelName);

    if (!channel) continue;

    await channel.permissionOverwrites.edit(everyone, {
      ViewChannel: true,
      SendMessages: true,
      ReadMessageHistory: true
    });
  }

  // Support público
  const supportChannel = getChannel(
    guild,
    "🆘・support"
  );

  if (supportChannel) {
    await supportChannel.permissionOverwrites.edit(everyone, {
      ViewChannel: true,
      SendMessages: true,
      ReadMessageHistory: true
    });
  }
}

// ======================================================
// SERVER SETUP
// ======================================================

async function setupServer(guild) {
  await createAllRoles(guild);

  // Categorías
  const summer = await getOrCreateCategory(
    guild,
    "☀️ SUMMER TIER LIST"
  );

  const information = await getOrCreateCategory(
    guild,
    "📌 INFORMATION"
  );

  const rolesCategory = await getOrCreateCategory(
    guild,
    "🔔 ROLES"
  );

  const media = await getOrCreateCategory(
    guild,
    "🎬 MEDIA"
  );

  const staff = await getOrCreateCategory(
    guild,
    "🛡️ STAFF"
  );

  const tickets = await getOrCreateCategory(
    guild,
    "🎫 TICKETS"
  );

  // Waitlists
  const channels = {};

  for (const mode of MODE_KEYS) {
    const info = MODES[mode];

    channels[mode] = await getOrCreateTextChannel(
      guild,
      `${info.emoji.toLowerCase()}・${mode}-waitlist`,
      summer
    );
  }

  const results = await getOrCreateTextChannel(
    guild,
    "📊・results",
    summer
  );

  const highResults = await getOrCreateTextChannel(
    guild,
    "🏆・high-results",
    summer
  );

  const announcements = await getOrCreateTextChannel(
    guild,
    "📢・announcements",
    summer
  );

  const support = await getOrCreateTextChannel(
    guild,
    "🆘・support",
    summer
  );

  const staffLogs = await getOrCreateTextChannel(
    guild,
    "📋・staff-logs",
    summer
  );

  const rules = await getOrCreateTextChannel(
    guild,
    "📜・rules",
    information
  );

  const howToPlay = await getOrCreateTextChannel(
    guild,
    "📖・how-to-play",
    information
  );

  const tierList = await getOrCreateTextChannel(
    guild,
    "🏆・tier-list",
    information
  );

  const roleChannel = await getOrCreateTextChannel(
    guild,
    "🔔・roles",
    rolesCategory
  );

  const screenshots = await getOrCreateTextChannel(
    guild,
    "📸・screenshots",
    media
  );

  const clips = await getOrCreateTextChannel(
    guild,
    "🎥・clips",
    media
  );

  const highlights = await getOrCreateTextChannel(
    guild,
    "🏅・highlights",
    media
  );

  const mediaChannel = await getOrCreateTextChannel(
    guild,
    "🖼️・media",
    media
  );

  const creations = await getOrCreateTextChannel(
    guild,
    "🎨・community-creations",
    media
  );

  const staffChat = await getOrCreateTextChannel(
    guild,
    "💬・staff-chat",
    staff
  );

  const applications = await getOrCreateTextChannel(
    guild,
    "📁・applications",
    staff
  );

  const ticketPanel = await getOrCreateTextChannel(
    guild,
    "🎫・ticket-panel",
    tickets
  );

  db.setupChannels = {
    ...channels,
    results: results.id,
    highResults: highResults.id,
    announcements: announcements.id,
    support: support.id,
    staffLogs: staffLogs.id,
    rules: rules.id,
    howToPlay: howToPlay.id,
    tierList: tierList.id,
    roleChannel: roleChannel.id,
    screenshots: screenshots.id,
    clips: clips.id,
    highlights: highlights.id,
    media: mediaChannel.id,
    creations: creations.id,
    staffChat: staffChat.id,
    applications: applications.id,
    ticketPanel: ticketPanel.id
  };

  saveDB();

  await configureStaffRoles(guild);
  await configureChannelPermissions(guild);

  // Panels
  for (const mode of MODE_KEYS) {
    await sendOrRefreshWaitlistPanel(
      channels[mode],
      mode
    );
  }

  await sendTicketPanel(ticketPanel);

  await sendRolePanel(roleChannel);

  return true;
}

// ======================================================
// WAITLIST PANEL
// ======================================================

function createWaitlistEmbed(mode) {
  const info = MODES[mode];

  const queue = db.waitlists[mode] || [];
  const status = db.waitlistStatus[mode];

  let queueText = "Nadie está en la waitlist.";

  if (queue.length > 0) {
    queueText = queue
      .map(
        (id, index) =>
          `**${index + 1}.** <@${id}>`
      )
      .join("\n");
  }

  return new EmbedBuilder()
    .setColor(0xf1c40f)
    .setTitle(
      `${info.emoji} ${info.name} Waitlist`
    )
    .setDescription(
      status
        ? "La waitlist está **abierta**.\n\nPulsa **Join** para entrar o **Leave** para salir."
        : "La waitlist está **cerrada**."
    )
    .addFields(
      {
        name: "👥 Players",
        value: `${queue.length}`,
        inline: true
      },
      {
        name: "🧪 Testers",
        value: `${db.testers[mode]?.length || 0}`,
        inline: true
      },
      {
        name: "📋 Queue",
        value: queueText,
        inline: false
      }
    )
    .setFooter({
      text: "Summer Tier List"
    });
}

function createWaitlistButtons(mode) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`wait_join:${mode}`)
      .setLabel("Join")
      .setEmoji("➕")
      .setStyle(ButtonStyle.Success),

    new ButtonBuilder()
      .setCustomId(`wait_leave:${mode}`)
      .setLabel("Leave")
      .setEmoji("➖")
      .setStyle(ButtonStyle.Danger),

    new ButtonBuilder()
      .setCustomId(`wait_view:${mode}`)
      .setLabel("View Queue")
      .setEmoji("📋")
      .setStyle(ButtonStyle.Secondary)
  );
}

async function sendOrRefreshWaitlistPanel(
  channel,
  mode
) {
  if (!channel) return;

  const embed = createWaitlistEmbed(mode);
  const row = createWaitlistButtons(mode);

  try {
    const messages = await channel.messages.fetch({
      limit: 20
    });

    const oldPanel = messages.find(
      message =>
        message.author.id === client.user.id &&
        message.embeds[0]?.title?.includes(
          `${MODES[mode].name} Waitlist`
        )
    );

    if (oldPanel) {
      await oldPanel.edit({
        embeds: [embed],
        components: [row]
      });
    } else {
      await channel.send({
        embeds: [embed],
        components: [row]
      });
    }
  } catch (error) {
    console.error(
      `❌ Error panel waitlist ${mode}:`,
      error.message
    );
  }
}

async function refreshWaitlist(guild, mode) {
  const channelName =
    `${MODES[mode].emoji.toLowerCase()}・${mode}-waitlist`;

  const channel = getChannel(guild, channelName);

  if (channel) {
    await sendOrRefreshWaitlistPanel(
      channel,
      mode
    );
  }
}

// ======================================================
// TICKET PANEL
// ======================================================

async function sendTicketPanel(channel) {
  if (!channel) return;

 const embed = new EmbedBuilder()
  .setColor(0x3498db)
  .setTitle("🎫 Summer Support")
  .setDescription(
    [
      "Selecciona el tipo de ticket que necesitas.",
      "",
      "🎫 **Support**",
      "Ayuda general.",
      "",
      "🧪 **Tester Application**",
      "Aplicación para Tester.",
      "",
      "📝 **Staff Application**",
      "Aplicación para Staff.",
      "",
      "🏆 **High Test**",
      "Solicitar un High Test.",
      "",
      "🤝 **Alliance Application**",
      "Solicitar una alianza con Summer Tier List.",
      "",
      "El High Test **no se solicita desde una waitlist**."
    ].join("\n")
  )
  .setFooter({
    text: "Summer Tier List"
  });

  const menu = new StringSelectMenuBuilder()
    .setCustomId("ticket_type")
    .setPlaceholder("Selecciona una opción")
    .addOptions(
      {
        label: "Support",
        description: "Ayuda general",
        value: "support",
        emoji: "🎫"
      },
      {
        label: "Tester Application",
        description: "Aplicar para Tester",
        value: "tester_application",
        emoji: "🧪"
      },
      {
        label: "Staff Application",
        description: "Aplicar para Staff",
        value: "staff_application",
        emoji: "📝"
      },
      
        {
  label: "High Test",
  description: "Solicitar High Test",
  value: "high_test",
  emoji: "🏆"
},
{
  label: "Alliance Application",
  description: "Solicitar una alianza con Summer Tier List",
  value: "alliance",
  emoji: "🤝"
}
    );

  const row = new ActionRowBuilder().addComponents(
    menu
  );

  try {
    const messages = await channel.messages.fetch({
      limit: 20
    });

    const old = messages.find(
      message =>
        message.author.id === client.user.id &&
        message.embeds[0]?.title === "🎫 Summer Support"
    );

    if (old) {
      await old.edit({
        embeds: [embed],
        components: [row]
      });
    } else {
      await channel.send({
        embeds: [embed],
        components: [row]
      });
    }
  } catch (error) {
    console.error(
      "❌ Error ticket panel:",
      error.message
    );
  }
}

// ======================================================
// ROLE PANEL
// ======================================================

async function sendRolePanel(channel) {
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setColor(0x9b59b6)
    .setTitle("🔔 Summer Roles")
    .setDescription(
      "Selecciona tus roles de región, notificaciones y modalidades."
    );

  const regionMenu = new StringSelectMenuBuilder()
    .setCustomId("role_region")
    .setPlaceholder("🌎 Selecciona tu región")
    .addOptions(
      REGION_ROLES.map(role => ({
        label: role.replace(/^.{2}/, ""),
        value: role,
        emoji: role.substring(0, 2)
      }))
    );

  const pingMenu = new StringSelectMenuBuilder()
    .setCustomId("role_ping")
    .setPlaceholder("🔔 Selecciona tus notificaciones")
    .addOptions(
      PING_ROLES.map(role => ({
        label: role.replace(/^.{2}/, ""),
        value: role,
        emoji: role.substring(0, 2)
      }))
    );

  const modeMenu = new StringSelectMenuBuilder()
    .setCustomId("role_mode")
    .setPlaceholder("⚔️ Selecciona tus modalidades")
    .setMinValues(1)
    .setMaxValues(MODE_ROLES.length)
    .addOptions(
      MODE_ROLES.map(role => ({
        label: role.replace(/^.{2}/, ""),
        value: role,
        emoji: role.substring(0, 2)
      }))
    );

  const rows = [
    new ActionRowBuilder().addComponents(regionMenu),
    new ActionRowBuilder().addComponents(pingMenu),
    new ActionRowBuilder().addComponents(modeMenu)
  ];

  try {
    const messages = await channel.messages.fetch({
      limit: 20
    });

    const old = messages.find(
      message =>
        message.author.id === client.user.id &&
        message.embeds[0]?.title === "🔔 Summer Roles"
    );

    if (old) {
      await old.edit({
        embeds: [embed],
        components: rows
      });
    } else {
      await channel.send({
        embeds: [embed],
        components: rows
      });
    }
  } catch (error) {
    console.error(
      "❌ Error role panel:",
      error.message
    );
  }
}

// ======================================================
// RESULT ROLE
// ======================================================

async function assignTierRole(member, mode, tier) {
  const info = MODES[mode];

  const targetRoleName =
    `${info.emoji} ${info.name} ${tier}`;

  const targetRole = getRole(
    member.guild,
    targetRoleName
  );

  if (!targetRole) {
    throw new Error(
      `No existe el rol ${targetRoleName}`
    );
  }

  // Quitar tiers anteriores de esta modalidad
  for (const oldTier of TIERS) {
    const oldRole = getRole(
      member.guild,
      `${info.emoji} ${info.name} ${oldTier}`
    );

    if (
      oldRole &&
      member.roles.cache.has(oldRole.id)
    ) {
      await member.roles.remove(oldRole);
    }
  }

  await member.roles.add(targetRole);

  return targetRole;
}

// ======================================================
// SLASH COMMANDS
// ======================================================

const commands = [
  new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Comprueba si el bot está online."),

  new SlashCommandBuilder()
    .setName("profile")
    .setDescription("Muestra el perfil de un jugador.")
    .addUserOption(option =>
      option
        .setName("jugador")
        .setDescription("Jugador")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("results")
    .setDescription("Muestra los últimos resultados."),

  new SlashCommandBuilder()
    .setName("setup")
    .setDescription("Configura el servidor completo.")
    .setDefaultMemberPermissions(
      PermissionFlagsBits.Administrator
    ),

  new SlashCommandBuilder()
    .setName("permissionsetup")
    .setDescription("Configura los permisos de roles y canales.")
    .setDefaultMemberPermissions(
      PermissionFlagsBits.Administrator
    ),

  new SlashCommandBuilder()
    .setName("staffsetup")
    .setDescription("Crea y configura los roles de staff.")
    .setDefaultMemberPermissions(
      PermissionFlagsBits.Administrator
    ),

  new SlashCommandBuilder()
    .setName("setupwaitlist")
    .setDescription("Actualiza todas las waitlists.")
    .setDefaultMemberPermissions(
      PermissionFlagsBits.Administrator
    ),

  new SlashCommandBuilder()
    .setName("reset")
    .setDescription("Reinicia las categorías y canales de Summer.")
    .setDefaultMemberPermissions(
      PermissionFlagsBits.Administrator
    ),

  new SlashCommandBuilder()
    .setName("waitlist")
    .setDescription("Abre o cierra una waitlist.")
    .addStringOption(option =>
      option
        .setName("modalidad")
        .setDescription("Modalidad")
        .setRequired(true)
        .addChoices(
          ...MODE_KEYS.map(mode => ({
            name: MODES[mode].name,
            value: mode
          }))
        )
    )
    .addStringOption(option =>
      option
        .setName("estado")
        .setDescription("Estado")
        .setRequired(true)
        .addChoices(
          {
            name: "Abrir",
            value: "open"
          },
          {
            name: "Cerrar",
            value: "close"
          }
        )
    ),

  new SlashCommandBuilder()
    .setName("settester")
    .setDescription("Añade un tester a una modalidad.")
    .addUserOption(option =>
      option
        .setName("usuario")
        .setDescription("Usuario")
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName("modalidad")
        .setDescription("Modalidad")
        .setRequired(true)
        .addChoices(
          ...MODE_KEYS.map(mode => ({
            name: MODES[mode].name,
            value: mode
          }))
        )
    ),

  new SlashCommandBuilder()
    .setName("removetester")
    .setDescription("Quita un tester de una modalidad.")
    .addUserOption(option =>
      option
        .setName("usuario")
        .setDescription("Usuario")
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName("modalidad")
        .setDescription("Modalidad")
        .setRequired(true)
        .addChoices(
          ...MODE_KEYS.map(mode => ({
            name: MODES[mode].name,
            value: mode
          }))
        )
    ),

  new SlashCommandBuilder()
    .setName("result")
    .setDescription("Registra un resultado oficial.")
    .addUserOption(option =>
      option
        .setName("jugador")
        .setDescription("Jugador")
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName("modalidad")
        .setDescription("Modalidad")
        .setRequired(true)
        .addChoices(
          ...MODE_KEYS.map(mode => ({
            name: MODES[mode].name,
            value: mode
          }))
        )
    )
    .addStringOption(option =>
      option
        .setName("tier")
        .setDescription("Tier")
        .setRequired(true)
        .addChoices(
          ...TIERS.map(tier => ({
            name: tier,
            value: tier
          }))
        )
    )
    .addStringOption(option =>
      option
        .setName("minecraft")
        .setDescription("Minecraft IGN")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("highresult")
    .setDescription("Registra un High Result.")
    .addUserOption(option =>
      option
        .setName("jugador")
        .setDescription("Jugador")
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName("modalidad")
        .setDescription("Modalidad")
        .setRequired(true)
        .addChoices(
          ...MODE_KEYS.map(mode => ({
            name: MODES[mode].name,
            value: mode
          }))
        )
    )
    .addStringOption(option =>
      option
        .setName("tier")
        .setDescription("Tier")
        .setRequired(true)
        .addChoices(
          ...TIERS.map(tier => ({
            name: tier,
            value: tier
          }))
        )
    )
    .addStringOption(option =>
      option
        .setName("minecraft")
        .setDescription("Minecraft IGN")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("removecooldown")
    .setDescription("Quita el cooldown de un jugador.")
    .addUserOption(option =>
      option
        .setName("jugador")
        .setDescription("Jugador")
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName("modalidad")
        .setDescription("Modalidad")
        .setRequired(true)
        .addChoices(
          ...MODE_KEYS.map(mode => ({
            name: MODES[mode].name,
            value: mode
          }))
        )
    )
];

// ======================================================
// COMMAND REGISTRATION
// ======================================================

async function registerCommands() {
  const rest = new REST({
    version: "10"
  }).setToken(TOKEN);

  await rest.put(
    Routes.applicationGuildCommands(
      CLIENT_ID,
      GUILD_ID
    ),
    {
      body: commands.map(command =>
        command.toJSON()
      )
    }
  );

  console.log("✅ Slash commands registrados.");
}

// ======================================================
// COMMAND PERMISSION CHECK
// ======================================================

function ownerOnly(interaction) {
  if (!isOwner(interaction.member)) {
    interaction.reply({
      content:
        "❌ Este comando solo puede ser utilizado por el rol **👑 Owner**.",
      ephemeral: true
    });

    return false;
  }

  return true;
}

// ======================================================
// INTERACTIONS
// ======================================================

client.on("interactionCreate", async interaction => {
  try {
    // ==================================================
    // BUTTONS
    // ==================================================

    if (interaction.isButton()) {
      const [action, mode] =
        interaction.customId.split(":");

      // ------------------------------
      // JOIN WAITLIST
      // ------------------------------

      if (action === "wait_join") {
        if (!MODES[mode]) return;

        if (!db.waitlistStatus[mode]) {
          return interaction.reply({
            content:
              "❌ Esta waitlist está cerrada.",
            ephemeral: true
          });
        }

        if (hasActiveCooldown(
          interaction.user.id,
          mode
        )) {
          return interaction.reply({
            content:
              `⏳ Tienes cooldown en **${MODES[mode].name}**.\n\nTiempo restante: **${formatDuration(
                cooldownRemaining(
                  interaction.user.id,
                  mode
                )
              )}**`,
            ephemeral: true
          });
        }

        if (
          db.waitlists[mode].includes(
            interaction.user.id
          )
        ) {
          return interaction.reply({
            content:
              "❌ Ya estás en esta waitlist.",
            ephemeral: true
          });
        }

        db.waitlists[mode].push(
          interaction.user.id
        );

        saveDB();

        await refreshWaitlist(
          interaction.guild,
          mode
        );

        return interaction.reply({
          content:
            `✅ Entraste a la waitlist de **${MODES[mode].name}**.`,
          ephemeral: true
        });
      }

      // ------------------------------
      // LEAVE WAITLIST
      // ------------------------------

      if (action === "wait_leave") {
        if (!MODES[mode]) return;

        const index =
          db.waitlists[mode].indexOf(
            interaction.user.id
          );

        if (index === -1) {
          return interaction.reply({
            content:
              "❌ No estás en esta waitlist.",
            ephemeral: true
          });
        }

        db.waitlists[mode].splice(
          index,
          1
        );

        saveDB();

        await refreshWaitlist(
          interaction.guild,
          mode
        );

        return interaction.reply({
          content:
            `✅ Saliste de la waitlist de **${MODES[mode].name}**.`,
          ephemeral: true
        });
      }

      // ------------------------------
      // VIEW QUEUE
      // ------------------------------

      if (action === "wait_view") {
        if (!MODES[mode]) return;

        const queue =
          db.waitlists[mode] || [];

        if (queue.length === 0) {
          return interaction.reply({
            content:
              `📋 La waitlist de **${MODES[mode].name}** está vacía.`,
            ephemeral: true
          });
        }

        const text = queue
          .map(
            (id, index) =>
              `**${index + 1}.** <@${id}>`
          )
          .join("\n");

        return interaction.reply({
          content:
            `📋 **${MODES[mode].name} Queue**\n\n${text}`,
          ephemeral: true
        });
      }

      // ------------------------------
      // CLOSE TICKET
      // ------------------------------

      if (
        interaction.customId ===
        "ticket_close"
      ) {
        if (!isStaff(interaction.member)) {
          return interaction.reply({
            content:
              "❌ No tienes permiso para cerrar este ticket.",
            ephemeral: true
          });
        }

        await interaction.reply({
          content:
            "🔒 Cerrando ticket en 5 segundos..."
        });

        setTimeout(async () => {
          try {
            await interaction.channel.delete(
              "Ticket cerrado"
            );
          } catch {}
        }, 5000);

        return;
      }

      return;
    }

    // ==================================================
    // SELECT MENUS
    // ==================================================

    if (interaction.isStringSelectMenu()) {
      // ------------------------------
      // TICKET
      // ------------------------------

      if (
        interaction.customId ===
        "ticket_type"
      ) {
        const type =
          interaction.values[0];

        const existing =
          interaction.guild.channels.cache.find(
            channel =>
              channel.topic ===
              `ticket-owner:${interaction.user.id}`
          );

        if (existing) {
          return interaction.reply({
            content:
              `❌ Ya tienes un ticket abierto: ${existing}`,
            ephemeral: true
          });
        }

      let ticketName;

if (type === "support") {
  ticketName =
    `support-${interaction.user.username}`;
} else if (
  type === "tester_application"
) {
  ticketName =
    `tester-${interaction.user.username}`;
} else if (
  type === "staff_application"
) {
  ticketName =
    `staff-${interaction.user.username}`;
} else if (
  type === "high_test"
) {
  ticketName =
    `high-test-${interaction.user.username}`;
} else if (
  type === "alliance"
) {
  ticketName =
    `alliance-${interaction.user.username}`;
}
        const category = getChannel(
          interaction.guild,
          "🎫 TICKETS"
        );

        const permissionOverwrites = [
          {
            id: interaction.guild.roles.everyone.id,
            deny: [
              PermissionFlagsBits.ViewChannel
            ]
          },
          {
            id: interaction.user.id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory
            ]
          }
        ];

        for (const roleName of STAFF_ROLES) {
          const role = getRole(
            interaction.guild,
            roleName
          );

          if (!role) continue;

          permissionOverwrites.push({
            id: role.id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory
            ]
          });
        }

        const ticket =
          await interaction.guild.channels.create({
            name: ticketName,
            type: ChannelType.GuildText,
            parent: category?.id || null,
            topic:
              `ticket-owner:${interaction.user.id}`,
            permissionOverwrites
          });

        const typeNames = {
          support: "🎫 Support",
          tester_application:
            "🧪 Tester Application",
          staff_application:
            "📝 Staff Application",
          high_test: "🏆 High Test"
        };

        const embed = new EmbedBuilder()
          .setColor(0x3498db)
          .setTitle(
            `${typeNames[type] || "🎫 Ticket"}`
          )
          .setDescription(
            [
              `Hola ${interaction.user}.`,
              "",
              "Un miembro del staff te atenderá pronto.",
              "",
              "Cuando el ticket termine, utiliza el botón de abajo para cerrarlo."
            ].join("\n")
          );

        const row =
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId("ticket_close")
              .setLabel("Cerrar ticket")
              .setEmoji("🔒")
              .setStyle(ButtonStyle.Danger)
          );

        await ticket.send({
          content: `${interaction.user}`,
          embeds: [embed],
          components: [row]
        });

        db.tickets.push({
          channelId: ticket.id,
          userId: interaction.user.id,
          type,
          createdAt: Date.now()
        });

        saveDB();

        return interaction.reply({
          content:
            `✅ Ticket creado: ${ticket}`,
          ephemeral: true
        });
      }

      // ------------------------------
      // REGION ROLES
      // ------------------------------

      if (
        interaction.customId ===
        "role_region"
      ) {
        const roleName =
          interaction.values[0];

        for (const name of REGION_ROLES) {
          const role = getRole(
            interaction.guild,
            name
          );

          if (
            role &&
            interaction.member.roles.cache.has(
              role.id
            )
          ) {
            await interaction.member.roles.remove(
              role
            );
          }
        }

        const role = getRole(
          interaction.guild,
          roleName
        );

        if (role) {
          await interaction.member.roles.add(
            role
          );
        }

        return interaction.reply({
          content:
            `🌎 Región seleccionada: **${roleName}**`,
          ephemeral: true
        });
      }

      // ------------------------------
      // PING ROLES
      // ------------------------------

      if (
        interaction.customId ===
        "role_ping"
      ) {
        const roleName =
          interaction.values[0];

        const role = getRole(
          interaction.guild,
          roleName
        );

        if (!role) {
          return interaction.reply({
            content:
              "❌ No se encontró ese rol.",
            ephemeral: true
          });
        }

        if (
          interaction.member.roles.cache.has(
            role.id
          )
        ) {
          await interaction.member.roles.remove(
            role
          );

          return interaction.reply({
            content:
              `❌ Quitaste ${role}.`,
            ephemeral: true
          });
        }

        await interaction.member.roles.add(
          role
        );

        return interaction.reply({
          content:
            `✅ Añadiste ${role}.`,
          ephemeral: true
        });
      }

      // ------------------------------
      // MODE ROLES
      // ------------------------------

      if (
        interaction.customId ===
        "role_mode"
      ) {
        for (const roleName of MODE_ROLES) {
          const role = getRole(
            interaction.guild,
            roleName
          );

          if (
            role &&
            interaction.member.roles.cache.has(
              role.id
            )
          ) {
            await interaction.member.roles.remove(
              role
            );
          }
        }

        for (const roleName of interaction.values) {
          const role = getRole(
            interaction.guild,
            roleName
          );

          if (role) {
            await interaction.member.roles.add(
              role
            );
          }
        }

        return interaction.reply({
          content:
            "✅ Tus roles de modalidad fueron actualizados.",
          ephemeral: true
        });
      }

      return;
    }

    // ==================================================
    // SLASH COMMANDS
    // ==================================================

    if (!interaction.isChatInputCommand()) {
      return;
    }

    // ==================================================
    // PING
    // ==================================================

    if (
      interaction.commandName ===
      "ping"
    ) {
      return interaction.reply({
        content:
          `🏓 Pong!\nLatencia: **${client.ws.ping}ms**`
      });
    }

    // ==================================================
    // PROFILE
    // ==================================================

    if (
      interaction.commandName ===
      "profile"
    ) {
      const user =
        interaction.options.getUser(
          "jugador"
        );

      const results = [
        ...db.results,
        ...db.highResults
      ].filter(
        result =>
          result.userId === user.id
      );

      const embed = new EmbedBuilder()
        .setColor(0xf1c40f)
        .setTitle(
          `👤 ${user.username} Profile`
        )
        .setThumbnail(
          user.displayAvatarURL({
            size: 256
          })
        )
        .setDescription(
          results.length === 0
            ? "Este jugador todavía no tiene resultados registrados."
            : `Resultados registrados: **${results.length}**`
        );

      if (results.length > 0) {
        const text = results
          .slice(-10)
          .reverse()
          .map(
            result =>
              `${MODES[result.mode]?.emoji || "⚔️"} **${MODES[result.mode]?.name || result.mode}** — **${result.tier}**`
          )
          .join("\n");

        embed.addFields({
          name: "🏆 Results",
          value: text
        });
      }

      return interaction.reply({
        embeds: [embed]
      });
    }

    // ==================================================
    // RESULTS
    // ==================================================

    if (
      interaction.commandName ===
      "results"
    ) {
      const results = [
        ...db.results,
        ...db.highResults
      ]
        .sort(
          (a, b) =>
            (b.createdAt || 0) -
            (a.createdAt || 0)
        )
        .slice(0, 10);

      if (results.length === 0) {
        return interaction.reply({
          content:
            "📊 Todavía no hay resultados."
        });
      }

      const text = results
        .map(
          result =>
            `${result.high ? "🏆" : "📊"} <@${result.userId}> — **${MODES[result.mode]?.name || result.mode} ${result.tier}**`
        )
        .join("\n");

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xf1c40f)
            .setTitle("📊 Latest Results")
            .setDescription(text)
        ]
      });
    }

    // ==================================================
    // SETUP
    // ==================================================

    if (
      interaction.commandName ===
      "setup"
    ) {
      if (!ownerOnly(interaction)) return;

      await interaction.deferReply({
        ephemeral: true
      });

      await setupServer(
        interaction.guild
      );

      return interaction.editReply(
        "✅ **Summer Tier List configurado correctamente.**\n\nSe crearon/configuraron canales, roles, waitlists, tickets y permisos."
      );
    }

    // ==================================================
    // PERMISSION SETUP
    // ==================================================

    if (
      interaction.commandName ===
      "permissionsetup"
    ) {
      if (!ownerOnly(interaction)) return;

      await interaction.deferReply({
        ephemeral: true
      });

      await createAllRoles(
        interaction.guild
      );

      await configureStaffRoles(
        interaction.guild
      );

      await configureChannelPermissions(
        interaction.guild
      );

      return interaction.editReply(
        "🔐 **Permisos configurados correctamente.**\n\n📢 Anuncios/resultados: todos ven, Admin+ escribe.\n🛡️ Staff: canales privados.\n🎫 Tickets: públicos para abrir tickets."
      );
    }

    // ==================================================
    // STAFF SETUP
    // ==================================================

    if (
      interaction.commandName ===
      "staffsetup"
    ) {
      if (!ownerOnly(interaction)) return;

      await interaction.deferReply({
        ephemeral: true
      });

      await createAllRoles(
        interaction.guild
      );

      await configureStaffRoles(
        interaction.guild
      );

      return interaction.editReply(
        "🛡️ **Roles de Staff creados/configurados correctamente.**"
      );
    }

    // ==================================================
    // SETUP WAITLIST
    // ==================================================

    if (
      interaction.commandName ===
      "setupwaitlist"
    ) {
      if (
        !(
          isAdmin(interaction.member) ||
          hasRole(
            interaction.member,
            "💎 Tierlist Manager"
          )
        )
      ) {
        return interaction.reply({
          content:
            "❌ No tienes permiso para usar este comando.",
          ephemeral: true
        });
      }

      await interaction.deferReply({
        ephemeral: true
      });

      for (const mode of MODE_KEYS) {
        await refreshWaitlist(
          interaction.guild,
          mode
        );
      }

      return interaction.editReply(
        "✅ Todas las waitlists fueron actualizadas."
      );
    }

    // ==================================================
    // RESET
    // ==================================================

    if (
      interaction.commandName ===
      "reset"
    ) {
      if (!ownerOnly(interaction)) return;

      await interaction.deferReply({
        ephemeral: true
      });

      const categories = [
        "☀️ SUMMER TIER LIST",
        "📌 INFORMATION",
        "🔔 ROLES",
        "🎬 MEDIA",
        "🛡️ STAFF",
        "🎫 TICKETS"
      ];

      for (const categoryName of categories) {
        const category =
          getChannel(
            interaction.guild,
            categoryName
          );

        if (!category) continue;

        const children =
          interaction.guild.channels.cache.filter(
            channel =>
              channel.parentId ===
              category.id
          );

        for (const channel of children.values()) {
          try {
            await channel.delete(
              "Summer Tier List reset"
            );
          } catch {}
        }

        try {
          await category.delete(
            "Summer Tier List reset"
          );
        } catch {}
      }

      db = defaultDatabase();
      saveDB();

      return interaction.editReply(
        "🗑️ **Reset completado.**\n\nSe eliminaron las categorías y canales de Summer Tier List.\n\n⚠️ Los roles NO fueron eliminados."
      );
    }

    // ==================================================
    // WAITLIST COMMAND
    // ==================================================

    if (
      interaction.commandName ===
      "waitlist"
    ) {
      if (
        !canManageWaitlist(
          interaction.member
        )
      ) {
        return interaction.reply({
          content:
            "❌ No tienes permiso para administrar waitlists.",
          ephemeral: true
        });
      }

      const mode =
        interaction.options.getString(
          "modalidad"
        );

      const status =
        interaction.options.getString(
          "estado"
        );

      db.waitlistStatus[mode] =
        status === "open";

      saveDB();

      await refreshWaitlist(
        interaction.guild,
        mode
      );

      return interaction.reply({
        content:
          `${MODES[mode].emoji} Waitlist **${MODES[mode].name}** ${status === "open" ? "abierta" : "cerrada"}.`,
        ephemeral: true
      });
    }

    // ==================================================
    // SET TESTER
    // ==================================================

    if (
      interaction.commandName ===
      "settester"
    ) {
      if (
        !(
          isAdmin(interaction.member) ||
          hasRole(
            interaction.member,
            "💎 Tierlist Manager"
          )
        )
      ) {
        return interaction.reply({
          content:
            "❌ Solo Owner, Administrator o Tierlist Manager.",
          ephemeral: true
        });
      }

      const user =
        interaction.options.getUser(
          "usuario"
        );

      const mode =
        interaction.options.getString(
          "modalidad"
        );

      if (
        db.testers[mode].includes(
          user.id
        )
      ) {
        return interaction.reply({
          content:
            "❌ Ese usuario ya es tester de esta modalidad.",
          ephemeral: true
        });
      }

      db.testers[mode].push(
        user.id
      );

      saveDB();

      return interaction.reply({
        content:
          `🧪 <@${user.id}> ahora es tester de **${MODES[mode].name}**.`,
        ephemeral: true
      });
    }

    // ==================================================
    // REMOVE TESTER
    // ==================================================

    if (
      interaction.commandName ===
      "removetester"
    ) {
      if (
        !(
          isAdmin(interaction.member) ||
          hasRole(
            interaction.member,
            "💎 Tierlist Manager"
          )
        )
      ) {
        return interaction.reply({
          content:
            "❌ Solo Owner, Administrator o Tierlist Manager.",
          ephemeral: true
        });
      }

      const user =
        interaction.options.getUser(
          "usuario"
        );

      const mode =
        interaction.options.getString(
          "modalidad"
        );

      db.testers[mode] =
        db.testers[mode].filter(
          id => id !== user.id
        );

      saveDB();

      return interaction.reply({
        content:
          `✅ <@${user.id}> fue eliminado como tester de **${MODES[mode].name}**.`,
        ephemeral: true
      });
    }

    // ==================================================
    // RESULT
    // ==================================================

    if (
      interaction.commandName ===
      "result"
    ) {
      const user =
        interaction.options.getUser(
          "jugador"
        );

      const mode =
        interaction.options.getString(
          "modalidad"
        );

      const tier =
        interaction.options.getString(
          "tier"
        );

      const minecraft =
        interaction.options.getString(
          "minecraft"
        );

      if (
        !canResult(
          interaction.member,
          mode
        )
      ) {
        return interaction.reply({
          content:
            `❌ No tienes permiso para registrar resultados de **${MODES[mode].name}**.`,
          ephemeral: true
        });
      }

      const member =
        await interaction.guild.members.fetch(
          user.id
        );

      const previous =
        db.results
          .filter(
            result =>
              result.userId === user.id &&
              result.mode === mode
          )
          .sort(
            (a, b) =>
              (b.createdAt || 0) -
              (a.createdAt || 0)
          )[0];

      let assignedRole;

      try {
        assignedRole =
          await assignTierRole(
            member,
            mode,
            tier
          );
      } catch (error) {
        return interaction.reply({
          content:
            `❌ No pude asignar el rol del tier.\n\n${error.message}\n\nAsegúrate de que el rol del bot esté por encima de los roles de tier.`,
          ephemeral: true
        });
      }

      const result = {
        userId: user.id,
        mode,
        tier,
        minecraft,
        testerId: interaction.user.id,
        previousTier:
          previous?.tier || null,
        createdAt: Date.now(),
        high: false
      };

      db.results.push(result);

      setCooldown(
        user.id,
        mode
      );

      db.waitlists[mode] =
        db.waitlists[mode].filter(
          id => id !== user.id
        );

      saveDB();

      await refreshWaitlist(
        interaction.guild,
        mode
      );

      const resultsChannel =
        getChannel(
          interaction.guild,
          "📊・results"
        );

      const skinUrl =
        `https://skinrender.dev/render/${encodeURIComponent(minecraft)}/avatar?size=256`;

      const embed = new EmbedBuilder()
        .setColor(0xf1c40f)
        .setTitle(
          `${MODES[mode].emoji} ${MODES[mode].name} Result`
        )
        .setThumbnail(skinUrl)
        .addFields(
          {
            name: "👤 Player",
            value: `${user}`,
            inline: true
          },
          {
            name: "🎮 Minecraft",
            value: `\`${minecraft}\``,
            inline: true
          },
          {
            name: "🏆 Tier",
            value: `**${tier}**`,
            inline: true
          },
          {
            name: "🧪 Tester",
            value: `${interaction.user}`,
            inline: true
          },
          {
            name: "📈 Previous Tier",
            value:
              previous?.tier ||
              "No previous result",
            inline: true
          }
        )
        .setTimestamp();

      if (resultsChannel) {
        await resultsChannel.send({
          embeds: [embed]
        });
      }

      return interaction.reply({
        content:
          `✅ Resultado registrado: **${MODES[mode].name} ${tier}** para ${user}.`,
        ephemeral: true
      });
    }

    // ==================================================
    // HIGH RESULT
    // ==================================================

    if (
      interaction.commandName ===
      "highresult"
    ) {
      if (
        !canHighResult(
          interaction.member
        )
      ) {
        return interaction.reply({
          content:
            "❌ No tienes permiso para registrar High Results.",
          ephemeral: true
        });
      }

      const user =
        interaction.options.getUser(
          "jugador"
        );

      const mode =
        interaction.options.getString(
          "modalidad"
        );

      const tier =
        interaction.options.getString(
          "tier"
        );

      const minecraft =
        interaction.options.getString(
          "minecraft"
        );

      const member =
        await interaction.guild.members.fetch(
          user.id
        );

      const previous =
        [
          ...db.results,
          ...db.highResults
        ]
          .filter(
            result =>
              result.userId === user.id &&
              result.mode === mode
          )
          .sort(
            (a, b) =>
              (b.createdAt || 0) -
              (a.createdAt || 0)
          )[0];

      try {
        await assignTierRole(
          member,
          mode,
          tier
        );
      } catch (error) {
        return interaction.reply({
          content:
            `❌ No pude asignar el rol del tier.\n\n${error.message}`,
          ephemeral: true
        });
      }

      const result = {
        userId: user.id,
        mode,
        tier,
        minecraft,
        testerId: interaction.user.id,
        previousTier:
          previous?.tier || null,
        createdAt: Date.now(),
        high: true
      };

      db.highResults.push(result);

      setCooldown(
        user.id,
        mode
      );

      db.waitlists[mode] =
        db.waitlists[mode].filter(
          id => id !== user.id
        );

      saveDB();

      await refreshWaitlist(
        interaction.guild,
        mode
      );

      const highResultsChannel =
        getChannel(
          interaction.guild,
          "🏆・high-results"
        );

      const skinUrl =
        `https://skinrender.dev/render/${encodeURIComponent(minecraft)}/avatar?size=256`;

      const embed = new EmbedBuilder()
        .setColor(0xf1c40f)
        .setTitle(
          `🏆 ${MODES[mode].name} High Result`
        )
        .setThumbnail(skinUrl)
        .addFields(
          {
            name: "👤 Player",
            value: `${user}`,
            inline: true
          },
          {
            name: "🎮 Minecraft",
            value: `\`${minecraft}\``,
            inline: true
          },
          {
            name: "🏆 Tier",
            value: `**${tier}**`,
            inline: true
          },
          {
            name: "🧪 Tester",
            value: `${interaction.user}`,
            inline: true
          },
          {
            name: "📈 Previous Tier",
            value:
              previous?.tier ||
              "No previous result",
            inline: true
          }
        )
        .setTimestamp();

      if (highResultsChannel) {
        await highResultsChannel.send({
          embeds: [embed]
        });
      }

      return interaction.reply({
        content:
          `🏆 High Result registrado: **${MODES[mode].name} ${tier}** para ${user}.`,
        ephemeral: true
      });
    }

    // ==================================================
    // REMOVE COOLDOWN
    // ==================================================

    if (
      interaction.commandName ===
      "removecooldown"
    ) {
      if (
        !canRemoveCooldown(
          interaction.member
        )
      ) {
        return interaction.reply({
          content:
            "❌ No tienes permiso para quitar cooldowns.",
          ephemeral: true
        });
      }

      const user =
        interaction.options.getUser(
          "jugador"
        );

      const mode =
        interaction.options.getString(
          "modalidad"
        );

      removeCooldown(
        user.id,
        mode
      );

      return interaction.reply({
        content:
          `✅ Cooldown eliminado para ${user} en **${MODES[mode].name}**.`,
        ephemeral: true
      });
    }
  } catch (error) {
    console.error(
      "❌ Interaction error:",
      error
    );

    try {
      if (interaction.replied) {
        await interaction.followUp({
          content:
            "❌ Ocurrió un error ejecutando esta acción.",
          ephemeral: true
        });
      } else if (interaction.deferred) {
        await interaction.editReply({
          content:
            "❌ Ocurrió un error ejecutando esta acción."
        });
      } else {
        await interaction.reply({
          content:
            "❌ Ocurrió un error ejecutando esta acción.",
          ephemeral: true
        });
      }
    } catch {}
  }
});

// ======================================================
// READY
// ======================================================

client.once("ready", async () => {
  console.log(
    `☀️ ${client.user.tag} está online.`
  );

  try {
    await registerCommands();
    console.log(
      "✅ Comandos registrados correctamente."
    );
  } catch (error) {
    console.error(
      "❌ Error registrando comandos:",
      error
    );
  }
});

// ======================================================
// LOGIN
// ======================================================
client.on("guildMemberAdd", async member => {
  try {
    const memberRole = member.guild.roles.cache.find(
      role => role.name === "Member"
    );

    if (!memberRole) {
      console.log("❌ No se encontró el rol Member.");
      return;
    }

    await member.roles.add(memberRole);

    console.log(
      `✅ ${member.user.tag} recibió automáticamente el rol Member.`
    );
  } catch (error) {
    console.error(
      "❌ Error asignando el rol Member:",
      error.message
    );
  }
});

client.login(TOKEN);
