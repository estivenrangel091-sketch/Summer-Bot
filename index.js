require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  Events,
  ChannelType,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  SlashCommandBuilder,
  REST,
  Routes
} = require("discord.js");

const fs = require("fs");
const path = require("path");

// =====================================================
// CONFIG
// =====================================================

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

if (!TOKEN || !CLIENT_ID || !GUILD_ID) {
  console.error("❌ Faltan variables de entorno:");
  console.error("DISCORD_TOKEN");
  console.error("CLIENT_ID");
  console.error("GUILD_ID");
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

const DB_FILE = path.join(__dirname, "database.json");

const MODES = {
  netpot: {
    name: "NetPot",
    emoji: "🟠",
    color: 0xf39c12
  },
  uhc: {
    name: "UHC",
    emoji: "🧪",
    color: 0x3498db
  },
  sword: {
    name: "Sword",
    emoji: "⚔️",
    color: 0xe74c3c
  },
  boxpvp: {
    name: "BoxPvP",
    emoji: "📦",
    color: 0x9b59b6
  },
  crystalpvp: {
    name: "CrystalPvP",
    emoji: "💎",
    color: 0x2ecc71
  }
};

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

const COOLDOWN_TIME = 3 * 24 * 60 * 60 * 1000;

// =====================================================
// ROLES
// =====================================================

const STAFF_ROLES = [
  { name: "👑 Owner", color: 0xffd700 },
  { name: "🛡️ Administrator", color: 0xff0000 },
  { name: "🔨 Moderator", color: 0x3498db },
  { name: "🛠️ Helper", color: 0x2ecc71 },
  { name: "💎 Tierlist Manager", color: 0x00ffff },
  { name: "🏆 High Tester", color: 0xf1c40f },
  { name: "🧪 Senior Tester", color: 0x9b59b6 },
  { name: "⚔️ Tester", color: 0x3498db },
  { name: "📋 Trial Tester", color: 0x95a5a6 },
  { name: "🎫 Support", color: 0x5865f2 },
  { name: "🧑‍💻 Developer", color: 0x7289da },
  { name: "🤝 Partner", color: 0x2ecc71 },
  { name: "📝 Staff Applicant", color: 0x95a5a6 }
];

const REGION_ROLES = [
  { name: "🇺🇸 North America", color: 0x3498db },
  { name: "🇪🇺 Europe", color: 0x5865f2 },
  { name: "🇧🇷 South America", color: 0x2ecc71 },
  { name: "🌏 Asia", color: 0xe74c3c },
  { name: "🇦🇺 Oceania", color: 0x9b59b6 },
  { name: "🌍 Other", color: 0x95a5a6 }
];

const PING_ROLES = [
  { name: "📢 Announcements", color: 0xf1c40f },
  { name: "🧪 Testing", color: 0x3498db },
  { name: "🏆 Results", color: 0x2ecc71 },
  { name: "🎫 Support", color: 0x9b59b6 },
  { name: "🎬 Media", color: 0xe67e22 },
  { name: "🏅 Events", color: 0xe74c3c }
];

// =====================================================
// DATABASE
// =====================================================

const DEFAULT_DB = {
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

function loadDB() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(
      DB_FILE,
      JSON.stringify(DEFAULT_DB, null, 2)
    );

    return JSON.parse(JSON.stringify(DEFAULT_DB));
  }

  try {
    const data = JSON.parse(
      fs.readFileSync(DB_FILE, "utf8")
    );

    for (const key of Object.keys(DEFAULT_DB)) {
      if (data[key] === undefined) {
        data[key] = JSON.parse(
          JSON.stringify(DEFAULT_DB[key])
        );
      }
    }

    for (const mode of Object.keys(MODES)) {
      if (!Array.isArray(data.waitlists[mode])) {
        data.waitlists[mode] = [];
      }

      if (data.waitlistStatus[mode] === undefined) {
        data.waitlistStatus[mode] = true;
      }

      if (!Array.isArray(data.testers[mode])) {
        data.testers[mode] = [];
      }
    }

    return data;
  } catch (error) {
    console.error("❌ Error leyendo database.json:", error);

    return JSON.parse(JSON.stringify(DEFAULT_DB));
  }
}

let db = loadDB();

function saveDB() {
  fs.writeFileSync(
    DB_FILE,
    JSON.stringify(db, null, 2)
  );
}

// =====================================================
// HELPERS
// =====================================================

function getMode(mode) {
  return MODES[mode];
}

function getCooldownKey(userId, mode) {
  return `${userId}:${mode}`;
}

function getCooldown(userId, mode) {
  const key = getCooldownKey(userId, mode);
  return db.cooldowns[key] || null;
}

function setCooldown(userId, mode) {
  const key = getCooldownKey(userId, mode);

  db.cooldowns[key] = Date.now() + COOLDOWN_TIME;

  saveDB();
}

function removeCooldown(userId, mode) {
  const key = getCooldownKey(userId, mode);

  delete db.cooldowns[key];

  saveDB();
}

function hasCooldown(userId, mode) {
  const cooldown = getCooldown(userId, mode);

  if (!cooldown) return false;

  if (Date.now() >= cooldown) {
    removeCooldown(userId, mode);
    return false;
  }

  return true;
}

function getRemainingCooldown(userId, mode) {
  const cooldown = getCooldown(userId, mode);

  if (!cooldown) return 0;

  const remaining = cooldown - Date.now();

  if (remaining <= 0) {
    removeCooldown(userId, mode);
    return 0;
  }

  return remaining;
}

function formatDuration(ms) {
  if (ms <= 0) return "0 minutos";

  const days = Math.floor(ms / 86400000);
  ms %= 86400000;

  const hours = Math.floor(ms / 3600000);
  ms %= 3600000;

  const minutes = Math.floor(ms / 60000);

  const parts = [];

  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (minutes) parts.push(`${minutes}m`);

  return parts.join(" ");
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

function isStaff(member) {
  if (!member) return false;

  if (
    member.permissions &&
    member.permissions.has(PermissionFlagsBits.Administrator)
  ) {
    return true;
  }

  return STAFF_ROLES.some(role =>
    member.roles.cache.some(
      memberRole => memberRole.name === role.name
    )
  );
}

function canManageWaitlist(member) {
  return (
    hasRole(member, "👑 Owner") ||
    hasRole(member, "🛡️ Administrator") ||
    hasRole(member, "💎 Tierlist Manager") ||
    hasRole(member, "🏆 High Tester") ||
    hasRole(member, "🧪 Senior Tester") ||
    hasRole(member, "⚔️ Tester")
  );
}

function canRemoveCooldown(member) {
  return (
    hasRole(member, "👑 Owner") ||
    hasRole(member, "🛡️ Administrator") ||
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
    hasRole(member, "👑 Owner") ||
    hasRole(member, "🛡️ Administrator") ||
    hasRole(member, "💎 Tierlist Manager") ||
    hasRole(member, "🏆 High Tester") ||
    hasRole(member, "🧪 Senior Tester")
  ) {
    return true;
  }

  return db.testers[mode]?.includes(member.id) || false;
}

function canHighResult(member) {
  return (
    hasRole(member, "👑 Owner") ||
    hasRole(member, "🛡️ Administrator") ||
    hasRole(member, "💎 Tierlist Manager") ||
    hasRole(member, "🏆 High Tester")
  );
}

function getModeTesterRoleName(mode) {
  return `${MODES[mode].emoji} Tester • ${MODES[mode].name}`;
}

function getModeTierRoleName(mode, tier) {
  return `${MODES[mode].emoji} ${MODES[mode].name} ${tier}`;
}

async function getOrCreateRole(guild, name, color = null) {
  let role = guild.roles.cache.find(
    r => r.name === name
  );

  if (role) return role;

  role = await guild.roles.create({
    name,
    color: color ?? undefined,
    reason: "Summer Tier List setup"
  });

  return role;
}

async function getOrCreateChannel(
  guild,
  name,
  type = ChannelType.GuildText,
  parent = null
) {
  let channel = guild.channels.cache.find(
    c => c.name === name && c.type === type
  );

  if (channel) {
    if (parent && channel.parentId !== parent.id) {
      try {
        await channel.setParent(parent.id);
      } catch {}
    }

    return channel;
  }

  return guild.channels.create({
    name,
    type,
    parent: parent?.id || undefined,
    reason: "Summer Tier List setup"
  });
}

// =====================================================
// EMBEDS
// =====================================================

function buildWaitlistEmbed(mode) {
  const info = MODES[mode];
  const queue = db.waitlists[mode] || [];
  const open = db.waitlistStatus[mode];

  const players = queue.length
    ? queue
        .map(
          (id, index) =>
            `**${index + 1}.** <@${id}>`
        )
        .join("\n")
    : "*The waitlist is currently empty.*";

  const testers = db.testers[mode]?.length || 0;

  return new EmbedBuilder()
    .setColor(info.color)
    .setTitle(`${info.emoji} ${info.name} Waitlist`)
    .setDescription(
      [
        `### ${open ? "🟢 OPEN" : "🔴 CLOSED"}`,
        "",
        `Welcome to the official **${info.name}** testing waitlist.`,
        "",
        "Join the queue and wait for a tester to contact you.",
        "Tickets are opened manually by staff.",
        "",
        `**Players in queue:** \`${queue.length}\``,
        `**Assigned testers:** \`${testers}\``,
        "",
        "### Queue",
        players
      ].join("\n")
    )
    .addFields(
      {
        name: "⏱️ Cooldown",
        value: "3 days after an official result.",
        inline: true
      },
      {
        name: "🎫 Tickets",
        value: "Opened manually by staff.",
        inline: true
      }
    )
    .setFooter({
      text: "Summer Tier List • Official Testing System"
    })
    .setTimestamp();
}

function buildWaitlistButtons(mode) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`waitlist:join:${mode}`)
      .setLabel("Join Waitlist")
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
}

function buildResultEmbed({
  player,
  mode,
  tier,
  minecraft,
  tester,
  high = false,
  previousTier = null
}) {
  const info = MODES[mode];

  const skinUrl =
    `https://skinrender.dev/render/${encodeURIComponent(minecraft)}/avatar?size=256`;

  const embed = new EmbedBuilder()
    .setColor(info.color)
    .setTitle(
      `${info.emoji} ${high ? "HIGH TEST RESULT" : "OFFICIAL RESULT"}`
    )
    .setDescription(
      [
        `## ${info.name}`,
        "",
        `### 🏆 ${tier}`,
        "",
        `**Player:** <@${player.id}>`,
        `**Minecraft:** \`${minecraft}\``,
        `**Tester:** ${tester}`,
        "",
        previousTier
          ? `**Previous Tier:** ${previousTier}`
          : "**Previous Tier:** Unranked"
      ].join("\n")
    )
    .setThumbnail(skinUrl)
    .addFields(
      {
        name: "🎯 Result",
        value: `\`${tier}\``,
        inline: true
      },
      {
        name: "🎮 Mode",
        value: `${info.emoji} ${info.name}`,
        inline: true
      },
      {
        name: high ? "🏆 Type" : "📊 Type",
        value: high ? "High Test" : "Official Result",
        inline: true
      }
    )
    .setFooter({
      text: "Summer Tier List • Official Ranking"
    })
    .setTimestamp();

  return embed;
}

// =====================================================
// ROLE PANEL
// =====================================================

function buildRolePanel() {
  const regionMenu = new StringSelectMenuBuilder()
    .setCustomId("roles:region")
    .setPlaceholder("🌍 Select your region")
    .setMinValues(1)
    .setMaxValues(1)
    .addOptions(
      REGION_ROLES.map(role =>
        new StringSelectMenuOptionBuilder()
          .setLabel(role.name)
          .setValue(role.name)
      )
    );

  const pingMenu = new StringSelectMenuBuilder()
    .setCustomId("roles:pings")
    .setPlaceholder("🔔 Select notification roles")
    .setMinValues(1)
    .setMaxValues(PING_ROLES.length)
    .addOptions(
      PING_ROLES.map(role =>
        new StringSelectMenuOptionBuilder()
          .setLabel(role.name)
          .setValue(role.name)
      )
    );

  const modalityMenu = new StringSelectMenuBuilder()
    .setCustomId("roles:modalities")
    .setPlaceholder("🎮 Select your PvP modes")
    .setMinValues(1)
    .setMaxValues(Object.keys(MODES).length)
    .addOptions(
      Object.entries(MODES).map(([key, mode]) =>
        new StringSelectMenuOptionBuilder()
          .setLabel(mode.name)
          .setEmoji(mode.emoji)
          .setValue(key)
      )
    );

  return [
    new ActionRowBuilder().addComponents(regionMenu),
    new ActionRowBuilder().addComponents(pingMenu),
    new ActionRowBuilder().addComponents(modalityMenu)
  ];
}

// =====================================================
// TICKET PANEL
// =====================================================

function buildTicketPanel() {
  const menu = new StringSelectMenuBuilder()
    .setCustomId("ticket:type")
    .setPlaceholder("🎫 Select a ticket type")
    .setMinValues(1)
    .setMaxValues(1)
    .addOptions(
      {
        label: "Support",
        description: "General help and questions",
        value: "support",
        emoji: "🎫"
      },
      {
        label: "Tester Application",
        description: "Apply to become a tester",
        value: "tester",
        emoji: "🧪"
      },
      {
        label: "Staff Application",
        description: "Apply for the staff team",
        value: "staff",
        emoji: "🛡️"
      },
      {
        label: "High Test",
        description: "Request a High Test",
        value: "high",
        emoji: "🏆"
      }
    );

  return new ActionRowBuilder().addComponents(menu);
}

function buildCloseTicketButton() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("ticket:close")
      .setLabel("Close Ticket")
      .setEmoji("🔒")
      .setStyle(ButtonStyle.Danger)
  );
}

// =====================================================
// SETUP
// =====================================================

async function createStaffRoles(guild) {
  for (const roleData of STAFF_ROLES) {
    await getOrCreateRole(
      guild,
      roleData.name,
      roleData.color
    );
  }
}

async function createCommunityRoles(guild) {
  for (const roleData of REGION_ROLES) {
    await getOrCreateRole(
      guild,
      roleData.name,
      roleData.color
    );
  }

  for (const roleData of PING_ROLES) {
    await getOrCreateRole(
      guild,
      roleData.name,
      roleData.color
    );
  }

  for (const [mode, info] of Object.entries(MODES)) {
    await getOrCreateRole(
      guild,
      `${info.emoji} ${info.name}`,
      info.color
    );

    await getOrCreateRole(
      guild,
      getModeTesterRoleName(mode),
      info.color
    );
  }
}

async function createTierRoles(guild) {
  for (const [mode, info] of Object.entries(MODES)) {
    for (const tier of TIERS) {
      await getOrCreateRole(
        guild,
        getModeTierRoleName(mode, tier),
        info.color
      );
    }
  }
}

async function setupServer(guild) {
  console.log("⚙️ Configurando Summer Tier List...");

  await createStaffRoles(guild);
  await createCommunityRoles(guild);
  await createTierRoles(guild);

  // ===============================
  // MAIN CATEGORY
  // ===============================

  const mainCategory = await getOrCreateChannel(
    guild,
    "☀️ SUMMER TIER LIST",
    ChannelType.GuildCategory
  );

  // ===============================
  // WAITLISTS
  // ===============================

  for (const [mode, info] of Object.entries(MODES)) {
    const channel = await getOrCreateChannel(
      guild,
      `${info.emoji.toLowerCase()}-${mode}-waitlist`,
      ChannelType.GuildText,
      mainCategory
    );

    db.setupChannels[`waitlist_${mode}`] = channel.id;

    await updateWaitlistChannel(channel, mode);
  }

  // ===============================
  // MAIN CHANNELS
  // ===============================

  const results = await getOrCreateChannel(
    guild,
    "📊・results",
    ChannelType.GuildText,
    mainCategory
  );

  const highResults = await getOrCreateChannel(
    guild,
    "🏆・high-results",
    ChannelType.GuildText,
    mainCategory
  );

  await getOrCreateChannel(
    guild,
    "📢・announcements",
    ChannelType.GuildText,
    mainCategory
  );

  await getOrCreateChannel(
    guild,
    "🆘・support",
    ChannelType.GuildText,
    mainCategory
  );

  await getOrCreateChannel(
    guild,
    "📋・staff-logs",
    ChannelType.GuildText,
    mainCategory
  );

  db.setupChannels.results = results.id;
  db.setupChannels.highResults = highResults.id;

  // ===============================
  // INFORMATION
  // ===============================

  const information = await getOrCreateChannel(
    guild,
    "📌 INFORMATION",
    ChannelType.GuildCategory
  );

  await getOrCreateChannel(
    guild,
    "📜・rules",
    ChannelType.GuildText,
    information
  );

  await getOrCreateChannel(
    guild,
    "📖・how-to-play",
    ChannelType.GuildText,
    information
  );

  await getOrCreateChannel(
    guild,
    "🏆・tier-list",
    ChannelType.GuildText,
    information
  );

  // ===============================
  // ROLES
  // ===============================

  const rolesCategory = await getOrCreateChannel(
    guild,
    "🔔 ROLES",
    ChannelType.GuildCategory
  );

  const rolesChannel = await getOrCreateChannel(
    guild,
    "🔔・roles",
    ChannelType.GuildText,
    rolesCategory
  );

  db.setupChannels.roles = rolesChannel.id;

  await rolesChannel.send({
    embeds: [
      new EmbedBuilder()
        .setColor(0xf1c40f)
        .setTitle("🔔 Summer Roles")
        .setDescription(
          [
            "Customize your experience in **Summer Tier List**.",
            "",
            "🌍 **Region**",
            "Select your region.",
            "",
            "🔔 **Notifications**",
            "Choose which notifications you want.",
            "",
            "🎮 **Modalities**",
            "Choose the PvP modes you play.",
            "",
            "Use the menus below."
          ].join("\n")
        )
        .setFooter({
          text: "Summer Tier List"
        })
    ],
    components: buildRolePanel()
  }).catch(() => {});
  
  // ===============================
  // MEDIA
  // ===============================

  const media = await getOrCreateChannel(
    guild,
    "🎬 MEDIA",
    ChannelType.GuildCategory
  );

  await getOrCreateChannel(
    guild,
    "📸・screenshots",
    ChannelType.GuildText,
    media
  );

  await getOrCreateChannel(
    guild,
    "🎥・clips",
    ChannelType.GuildText,
    media
  );

  await getOrCreateChannel(
    guild,
    "🏅・highlights",
    ChannelType.GuildText,
    media
  );

  await getOrCreateChannel(
    guild,
    "🖼️・media",
    ChannelType.GuildText,
    media
  );

  await getOrCreateChannel(
    guild,
    "🎨・community-creations",
    ChannelType.GuildText,
    media
  );

  // ===============================
  // STAFF
  // ===============================

  const staff = await getOrCreateChannel(
    guild,
    "🛡️ STAFF",
    ChannelType.GuildCategory
  );

  await getOrCreateChannel(
    guild,
    "💬・staff-chat",
    ChannelType.GuildText,
    staff
  );

  await getOrCreateChannel(
    guild,
    "📁・applications",
    ChannelType.GuildText,
    staff
  );

  // ===============================
  // TICKETS
  // ===============================

  const tickets = await getOrCreateChannel(
    guild,
    "🎫 TICKETS",
    ChannelType.GuildCategory
  );

  const ticketPanel = await getOrCreateChannel(
    guild,
    "🎫・ticket-panel",
    ChannelType.GuildText,
    tickets
  );

  db.setupChannels.ticketPanel = ticketPanel.id;

  await ticketPanel.send({
    embeds: [
      new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle("🎫 Summer Support Center")
        .setDescription(
          [
            "Need help or want to apply?",
            "",
            "Select an option from the menu below.",
            "",
            "🎫 **Support**",
            "General questions and assistance.",
            "",
            "🧪 **Tester Application**",
            "Apply to join the testing team.",
            "",
            "🛡️ **Staff Application**",
            "Apply for the staff team.",
            "",
            "🏆 **High Test**",
            "Request a High Test through Support."
          ].join("\n")
        )
        .setFooter({
          text: "Summer Tier List • Support"
        })
        .setTimestamp()
    ],
    components: [buildTicketPanel()]
  }).catch(() => {});

  saveDB();

  console.log("✅ Summer Tier List configurado.");
}

async function updateWaitlistChannel(channel, mode) {
  const messages = await channel.messages.fetch({
    limit: 20
  }).catch(() => null);

  if (messages) {
    const botMessage = messages.find(
      message =>
        message.author.id === client.user.id &&
        message.embeds.length > 0 &&
        message.embeds[0].title?.includes(
          `${MODES[mode].name} Waitlist`
        )
    );

    if (botMessage) {
      await botMessage.edit({
        embeds: [buildWaitlistEmbed(mode)],
        components: [buildWaitlistButtons(mode)]
      }).catch(() => {});

      return;
    }
  }

  await channel.send({
    embeds: [buildWaitlistEmbed(mode)],
    components: [buildWaitlistButtons(mode)]
  }).catch(() => {});
}

// =====================================================
// SLASH COMMANDS
// =====================================================

const commands = [
  new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Check if the bot is online."),

  new SlashCommandBuilder()
    .setName("setup")
    .setDescription("Set up the complete Summer Tier List server.")
    .setDefaultMemberPermissions(
      PermissionFlagsBits.Administrator
    ),

  new SlashCommandBuilder()
    .setName("setupwaitlist")
    .setDescription("Refresh all modality waitlists.")
    .setDefaultMemberPermissions(
      PermissionFlagsBits.Administrator
    ),

  new SlashCommandBuilder()
    .setName("roles")
    .setDescription("Send the role selection panel.")
    .setDefaultMemberPermissions(
      PermissionFlagsBits.Administrator
    ),

  new SlashCommandBuilder()
    .setName("waitlist")
    .setDescription("Open or close a modality waitlist.")
    .addStringOption(option =>
      option
        .setName("modalidad")
        .setDescription("PvP modality")
        .setRequired(true)
        .addChoices(
          ...Object.entries(MODES).map(([value, mode]) => ({
            name: mode.name,
            value
          }))
        )
    )
    .addBooleanOption(option =>
      option
        .setName("estado")
        .setDescription("Open = true, Closed = false")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(
      PermissionFlagsBits.ManageGuild
    ),

  new SlashCommandBuilder()
    .setName("settester")
    .setDescription("Assign a tester to a modality.")
    .addUserOption(option =>
      option
        .setName("usuario")
        .setDescription("User")
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName("modalidad")
        .setDescription("Modality")
        .setRequired(true)
        .addChoices(
          ...Object.entries(MODES).map(([value, mode]) => ({
            name: mode.name,
            value
          }))
        )
    )
    .setDefaultMemberPermissions(
      PermissionFlagsBits.ManageGuild
    ),

  new SlashCommandBuilder()
    .setName("removetester")
    .setDescription("Remove a tester from a modality.")
    .addUserOption(option =>
      option
        .setName("usuario")
        .setDescription("User")
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName("modalidad")
        .setDescription("Modality")
        .setRequired(true)
        .addChoices(
          ...Object.entries(MODES).map(([value, mode]) => ({
            name: mode.name,
            value
          }))
        )
    )
    .setDefaultMemberPermissions(
      PermissionFlagsBits.ManageGuild
    ),

  new SlashCommandBuilder()
    .setName("result")
    .setDescription("Publish an official test result.")
    .addUserOption(option =>
      option
        .setName("jugador")
        .setDescription("Player")
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName("modalidad")
        .setDescription("Modality")
        .setRequired(true)
        .addChoices(
          ...Object.entries(MODES).map(([value, mode]) => ({
            name: mode.name,
            value
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
        .setDescription("Minecraft username")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("highresult")
    .setDescription("Publish a High Test result.")
    .addUserOption(option =>
      option
        .setName("jugador")
        .setDescription("Player")
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName("modalidad")
        .setDescription("Modality")
        .setRequired(true)
        .addChoices(
          ...Object.entries(MODES).map(([value, mode]) => ({
            name: mode.name,
            value
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
        .setDescription("Minecraft username")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("removecooldown")
    .setDescription("Remove a player's cooldown.")
    .addUserOption(option =>
      option
        .setName("jugador")
        .setDescription("Player")
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName("modalidad")
        .setDescription("Modality")
        .setRequired(true)
        .addChoices(
          ...Object.entries(MODES).map(([value, mode]) => ({
            name: mode.name,
            value
          }))
        )
    )
    .setDefaultMemberPermissions(
      PermissionFlagsBits.ManageGuild
    ),

  new SlashCommandBuilder()
    .setName("results")
    .setDescription("Show recent results."),

  new SlashCommandBuilder()
    .setName("queue")
    .setDescription("Show the waitlist for a modality.")
    .addStringOption(option =>
      option
        .setName("modalidad")
        .setDescription("Modality")
        .setRequired(true)
        .addChoices(
          ...Object.entries(MODES).map(([value, mode]) => ({
            name: mode.name,
            value
          }))
        )
    ),

  new SlashCommandBuilder()
    .setName("profile")
    .setDescription("Show a player's tier profile.")
    .addUserOption(option =>
      option
        .setName("jugador")
        .setDescription("Player")
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("support")
    .setDescription("Show the support ticket information."),

  new SlashCommandBuilder()
    .setName("staffsetup")
    .setDescription("Refresh staff configuration.")
    .setDefaultMemberPermissions(
      PermissionFlagsBits.Administrator
    ),

  new SlashCommandBuilder()
    .setName("reset")
    .setDescription("Reset Summer Tier List channels and database.")
    .setDefaultMemberPermissions(
      PermissionFlagsBits.Administrator
    )
].map(command => command.toJSON());

// =====================================================
// REGISTER COMMANDS
// =====================================================

async function registerCommands() {
  const rest = new REST({
    version: "10"
  }).setToken(TOKEN);

  try {
    console.log("🔄 Registrando comandos...");

    await rest.put(
      Routes.applicationGuildCommands(
        CLIENT_ID,
        GUILD_ID
      ),
      {
        body: commands
      }
    );

    console.log("✅ Comandos registrados.");
  } catch (error) {
    console.error(
      "❌ Error registrando comandos:",
      error
    );
  }
}

// =====================================================
// READY
// =====================================================

client.once(Events.ClientReady, async readyClient => {
  console.log(
    `☀️ ${readyClient.user.tag} está online.`
  );

  const guild = readyClient.guilds.cache.get(GUILD_ID);

  if (!guild) {
    console.error(
      "❌ No se encontró el servidor configurado con GUILD_ID."
    );

    return;
  }

  await registerCommands();

  console.log(
    `🏠 Servidor: ${guild.name}`
  );

  // No configura automáticamente el servidor aquí.
  // Usa /setup para hacerlo manualmente.
});

// =====================================================
// INTERACTIONS
// =====================================================

client.on(
  Events.InteractionCreate,
  async interaction => {
    try {
      // =================================================
      // SLASH COMMANDS
      // =================================================

      if (interaction.isChatInputCommand()) {
        const command = interaction.commandName;

        // -----------------------------
        // PING
        // -----------------------------

        if (command === "ping") {
          const latency =
            Date.now() -
            interaction.createdTimestamp;

          return interaction.reply({
            content: `🏓 Pong! \`${latency}ms\``,
            ephemeral: true
          });
        }

        // -----------------------------
        // SETUP
        // -----------------------------

        if (command === "setup") {
          if (
            !interaction.member.permissions.has(
              PermissionFlagsBits.Administrator
            )
          ) {
            return interaction.reply({
              content:
                "❌ You need Administrator permissions.",
              ephemeral: true
            });
          }

          await interaction.deferReply({
            ephemeral: true
          });

          await setupServer(
            interaction.guild
          );

          return interaction.editReply(
            "✅ **Summer Tier List** has been configured successfully."
          );
        }

        // -----------------------------
        // SETUP WAITLIST
        // -----------------------------

        if (command === "setupwaitlist") {
          if (
            !interaction.member.permissions.has(
              PermissionFlagsBits.Administrator
            )
          ) {
            return interaction.reply({
              content:
                "❌ You need Administrator permissions.",
              ephemeral: true
            });
          }

          await interaction.deferReply({
            ephemeral: true
          });

          for (const [mode, info] of Object.entries(MODES)) {
            const channelId =
              db.setupChannels[`waitlist_${mode}`];

            let channel = channelId
              ? interaction.guild.channels.cache.get(
                  channelId
                )
              : null;

            if (!channel) {
              channel =
                interaction.guild.channels.cache.find(
                  c =>
                    c.name.includes(
                      `${mode}-waitlist`
                    )
                );
            }

            if (channel) {
              await updateWaitlistChannel(
                channel,
                mode
              );
            }
          }

          return interaction.editReply(
            "✅ All waitlist panels have been updated."
          );
        }

        // -----------------------------
        // ROLES
        // -----------------------------

        if (command === "roles") {
          if (
            !interaction.member.permissions.has(
              PermissionFlagsBits.Administrator
            )
          ) {
            return interaction.reply({
              content:
                "❌ You need Administrator permissions.",
              ephemeral: true
            });
          }

          const channel =
            interaction.channel;

          await channel.send({
            embeds: [
              new EmbedBuilder()
                .setColor(0xf1c40f)
                .setTitle("🔔 Summer Roles")
                .setDescription(
                  [
                    "Select your region, notifications and PvP modalities.",
                    "",
                    "🌍 Region",
                    "Choose one region.",
                    "",
                    "🔔 Notifications",
                    "Choose the notifications you want.",
                    "",
                    "🎮 Modalities",
                    "Choose the modes you play."
                  ].join("\n")
                )
                .setFooter({
                  text: "Summer Tier List"
                })
            ],
            components: buildRolePanel()
          });

          return interaction.reply({
            content:
              "✅ Role panel sent.",
            ephemeral: true
          });
        }

        // -----------------------------
        // WAITLIST
        // -----------------------------

        if (command === "waitlist") {
          if (!canManageWaitlist(interaction.member)) {
            return interaction.reply({
              content:
                "❌ You do not have permission to manage waitlists.",
              ephemeral: true
            });
          }

          const mode =
            interaction.options.getString(
              "modalidad"
            );

          const status =
            interaction.options.getBoolean(
              "estado"
            );

          db.waitlistStatus[mode] = status;

          saveDB();

          const channelId =
            db.setupChannels[
              `waitlist_${mode}`
            ];

          const channel =
            interaction.guild.channels.cache.get(
              channelId
            );

          if (channel) {
            await updateWaitlistChannel(
              channel,
              mode
            );
          }

          return interaction.reply({
            content:
              `${MODES[mode].emoji} **${MODES[mode].name}** waitlist is now ${
                status ? "🟢 OPEN" : "🔴 CLOSED"
              }.`,
            ephemeral: true
          });
        }

        // -----------------------------
        // SET TESTER
        // -----------------------------

        if (command === "settester") {
          if (
            !(
              hasRole(
                interaction.member,
                "👑 Owner"
              ) ||
              hasRole(
                interaction.member,
                "🛡️ Administrator"
              ) ||
              hasRole(
                interaction.member,
                "💎 Tierlist Manager"
              )
            )
          ) {
            return interaction.reply({
              content:
                "❌ You do not have permission.",
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
            !db.testers[mode].includes(
              user.id
            )
          ) {
            db.testers[mode].push(
              user.id
            );
          }

          const member =
            await interaction.guild.members.fetch(
              user.id
            );

          const role =
            await getOrCreateRole(
              interaction.guild,
              getModeTesterRoleName(mode),
              MODES[mode].color
            );

          await member.roles.add(
            role
          );

          saveDB();

          return interaction.reply({
            content:
              `✅ ${user} is now a **${MODES[mode].name} Tester**.`,
            ephemeral: true
          });
        }

        // -----------------------------
        // REMOVE TESTER
        // -----------------------------

        if (command === "removetester") {
          if (
            !(
              hasRole(
                interaction.member,
                "👑 Owner"
              ) ||
              hasRole(
                interaction.member,
                "🛡️ Administrator"
              ) ||
              hasRole(
                interaction.member,
                "💎 Tierlist Manager"
              )
            )
          ) {
            return interaction.reply({
              content:
                "❌ You do not have permission.",
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

          const member =
            await interaction.guild.members.fetch(
              user.id
            ).catch(() => null);

          if (member) {
            const role =
              interaction.guild.roles.cache.find(
                r =>
                  r.name ===
                  getModeTesterRoleName(
                    mode
                  )
              );

            if (role) {
              await member.roles.remove(
                role
              ).catch(() => {});
            }
          }

          saveDB();

          return interaction.reply({
            content:
              `✅ ${user} was removed from the **${MODES[mode].name} Tester** pool.`,
            ephemeral: true
          });
        }

        // -----------------------------
        // RESULT
        // -----------------------------

        if (command === "result") {
          if (
            !canResult(
              interaction.member,
              interaction.options.getString(
                "modalidad"
              )
            )
          ) {
            return interaction.reply({
              content:
                "❌ You do not have permission to publish results for this modality.",
              ephemeral: true
            });
          }

          const player =
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

          const profile =
            db.profiles[player.id] || {};

          const previousTier =
            profile[mode] || null;

          db.profiles[player.id] =
            profile;

          db.profiles[player.id][mode] =
            tier;

          db.results.push({
            playerId: player.id,
            mode,
            tier,
            minecraft,
            testerId:
              interaction.user.id,
            timestamp: Date.now()
          });

          setCooldown(
            player.id,
            mode
          );

          db.waitlists[mode] =
            db.waitlists[mode].filter(
              id => id !== player.id
            );

          saveDB();

          // Tier role
          const tierRole =
            await getOrCreateRole(
              interaction.guild,
              getModeTierRoleName(
                mode,
                tier
              ),
              MODES[mode].color
            );

          const member =
            await interaction.guild.members.fetch(
              player.id
            );

          const oldTierRoles =
            interaction.guild.roles.cache.filter(
              role =>
                role.name.startsWith(
                  `${MODES[mode].emoji} ${MODES[mode].name} `
                ) &&
                role.id !== tierRole.id
            );

          for (const role of oldTierRoles.values()) {
            await member.roles
              .remove(role)
              .catch(() => {});
          }

          await member.roles
            .add(tierRole)
            .catch(() => {});

          // Result channel
          const channelId =
            db.setupChannels.results;

          const channel =
            interaction.guild.channels.cache.get(
              channelId
            ) ||
            interaction.channel;

          await channel.send({
            embeds: [
              buildResultEmbed({
                player,
                mode,
                tier,
                minecraft,
                tester:
                  interaction.user,
                high: false,
                previousTier
              })
            ]
          });

          const waitlistChannel =
            interaction.guild.channels.cache.get(
              db.setupChannels[
                `waitlist_${mode}`
              ]
            );

          if (waitlistChannel) {
            await updateWaitlistChannel(
              waitlistChannel,
              mode
            );
          }

          return interaction.reply({
            content:
              `✅ Official result published for ${player}.`,
            ephemeral: true
          });
        }

        // -----------------------------
        // HIGH RESULT
        // -----------------------------

        if (command === "highresult") {
          if (
            !canHighResult(
              interaction.member
            )
          ) {
            return interaction.reply({
              content:
                "❌ You do not have permission to publish High Test results.",
              ephemeral: true
            });
          }

          const player =
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

          const profile =
            db.profiles[player.id] || {};

          const previousTier =
            profile[mode] || null;

          db.profiles[player.id] =
            profile;

          db.profiles[player.id][mode] =
            tier;

          db.highResults.push({
            playerId: player.id,
            mode,
            tier,
            minecraft,
            testerId:
              interaction.user.id,
            timestamp: Date.now()
          });

          setCooldown(
            player.id,
            mode
          );

          db.waitlists[mode] =
            db.waitlists[mode].filter(
              id => id !== player.id
            );

          saveDB();

          const tierRole =
            await getOrCreateRole(
              interaction.guild,
              getModeTierRoleName(
                mode,
                tier
              ),
              MODES[mode].color
            );

          const member =
            await interaction.guild.members.fetch(
              player.id
            );

          const oldTierRoles =
            interaction.guild.roles.cache.filter(
              role =>
                role.name.startsWith(
                  `${MODES[mode].emoji} ${MODES[mode].name} `
                ) &&
                role.id !== tierRole.id
            );

          for (const role of oldTierRoles.values()) {
            await member.roles
              .remove(role)
              .catch(() => {});
          }

          await member.roles
            .add(tierRole)
            .catch(() => {});

          const channelId =
            db.setupChannels.highResults;

          const channel =
            interaction.guild.channels.cache.get(
              channelId
            ) ||
            interaction.channel;

          await channel.send({
            embeds: [
              buildResultEmbed({
                player,
                mode,
                tier,
                minecraft,
                tester:
                  interaction.user,
                high: true,
                previousTier
              })
            ]
          });

          const waitlistChannel =
            interaction.guild.channels.cache.get(
              db.setupChannels[
                `waitlist_${mode}`
              ]
            );

          if (waitlistChannel) {
            await updateWaitlistChannel(
              waitlistChannel,
              mode
            );
          }

          return interaction.reply({
            content:
              `🏆 High Test result published for ${player}.`,
            ephemeral: true
          });
        }

        // -----------------------------
        // REMOVE COOLDOWN
        // -----------------------------

        if (command === "removecooldown") {
          if (
            !canRemoveCooldown(
              interaction.member
            )
          ) {
            return interaction.reply({
              content:
                "❌ You do not have permission.",
              ephemeral: true
            });
          }

          const player =
            interaction.options.getUser(
              "jugador"
            );

          const mode =
            interaction.options.getString(
              "modalidad"
            );

          removeCooldown(
            player.id,
            mode
          );

          return interaction.reply({
            content:
              `✅ Cooldown removed for ${player} in **${MODES[mode].name}**.`,
            ephemeral: true
          });
        }

        // -----------------------------
        // RESULTS
        // -----------------------------

        if (command === "results") {
          const recent =
            db.results
              .slice(-10)
              .reverse();

          if (!recent.length) {
            return interaction.reply({
              content:
                "📊 No results yet.",
              ephemeral: true
            });
          }

          const description =
            recent
              .map(result => {
                const info =
                  MODES[result.mode];

                return [
                  `${info.emoji} **${info.name}**`,
                  `<@${result.playerId}> — **${result.tier}**`,
                  `\`${result.minecraft}\``
                ].join(" ");
              })
              .join("\n\n");

          return interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setColor(0x5865f2)
                .setTitle(
                  "📊 Recent Results"
                )
                .setDescription(
                  description
                )
                .setFooter({
                  text: "Summer Tier List"
                })
            ],
            ephemeral: true
          });
        }

        // -----------------------------
        // QUEUE
        // -----------------------------

        if (command === "queue") {
          const mode =
            interaction.options.getString(
              "modalidad"
            );

          const queue =
            db.waitlists[mode];

          const list =
            queue.length
              ? queue
                  .map(
                    (id, index) =>
                      `**${index + 1}.** <@${id}>`
                  )
                  .join("\n")
              : "*Empty*";

          return interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setColor(
                  MODES[mode].color
                )
                .setTitle(
                  `${MODES[mode].emoji} ${MODES[mode].name} Queue`
                )
                .setDescription(
                  list
                )
                .setFooter({
                  text: `${queue.length} player(s) waiting`
                })
            ],
            ephemeral: true
          });
        }

        // -----------------------------
        // PROFILE
        // -----------------------------

        if (command === "profile") {
          const player =
            interaction.options.getUser(
              "jugador"
            ) ||
            interaction.user;

          const profile =
            db.profiles[player.id] || {};

          const lines =
            Object.entries(MODES)
              .map(([mode, info]) => {
                return `${info.emoji} **${info.name}:** ${
                  profile[mode] || "Unranked"
                }`;
              })
              .join("\n");

          return interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setColor(0x5865f2)
                .setTitle(
                  `🏆 ${player.username}'s Profile`
                )
                .setThumbnail(
                  player.displayAvatarURL({
                    size: 256
                  })
                )
                .setDescription(
                  lines
                )
                .setFooter({
                  text: "Summer Tier List"
                })
            ],
            ephemeral: true
          });
        }

        // -----------------------------
        // SUPPORT
        // -----------------------------

        if (command === "support") {
          return interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setColor(0x5865f2)
                .setTitle(
                  "🎫 Summer Support"
                )
                .setDescription(
                  [
                    "Need assistance?",
                    "",
                    "Use the ticket panel in",
                    "`🎫・ticket-panel`",
                    "",
                    "Available tickets:",
                    "🎫 Support",
                    "🧪 Tester Application",
                    "🛡️ Staff Application",
                    "🏆 High Test"
                  ].join("\n")
                )
            ],
            ephemeral: true
          });
        }

        // -----------------------------
        // STAFF SETUP
        // -----------------------------

        if (command === "staffsetup") {
          if (
            !interaction.member.permissions.has(
              PermissionFlagsBits.Administrator
            )
          ) {
            return interaction.reply({
              content:
                "❌ You need Administrator permissions.",
              ephemeral: true
            });
          }

          await interaction.deferReply({
            ephemeral: true
          });

          await createStaffRoles(
            interaction.guild
          );

          return interaction.editReply(
            "✅ Staff roles refreshed."
          );
        }

        // -----------------------------
        // RESET
        // -----------------------------

        if (command === "reset") {
          if (
            !interaction.member.permissions.has(
              PermissionFlagsBits.Administrator
            )
          ) {
            return interaction.reply({
              content:
                "❌ You need Administrator permissions.",
              ephemeral: true
            });
          }

          await interaction.deferReply({
            ephemeral: true
          });

          const categoryNames = [
            "☀️ SUMMER TIER LIST",
            "📌 INFORMATION",
            "🔔 ROLES",
            "🎬 MEDIA",
            "🛡️ STAFF",
            "🎫 TICKETS"
          ];

          for (const categoryName of categoryNames) {
            const category =
              interaction.guild.channels.cache.find(
                c =>
                  c.type ===
                    ChannelType.GuildCategory &&
                  c.name === categoryName
              );

            if (!category) continue;

            const children =
              interaction.guild.channels.cache.filter(
                c =>
                  c.parentId ===
                  category.id
              );

            for (const channel of children.values()) {
              await channel.delete().catch(() => {});
            }

            await category
              .delete()
              .catch(() => {});
          }

          db =
            JSON.parse(
              JSON.stringify(
                DEFAULT_DB
              )
            );

          saveDB();

          return interaction.editReply(
            "♻️ Server channels and database have been reset. Roles were not deleted."
          );
        }
      }

      // =================================================
      // WAITLIST BUTTONS
      // =================================================

      if (interaction.isButton()) {
        const parts =
          interaction.customId.split(":");

        if (
          parts[0] === "waitlist"
        ) {
          const action =
            parts[1];

          const mode =
            parts[2];

          if (!MODES[mode]) {
            return interaction.reply({
              content:
                "❌ Invalid modality.",
              ephemeral: true
            });
          }

          // JOIN
          if (action === "join") {
            if (
              !db.waitlistStatus[mode]
            ) {
              return interaction.reply({
                content:
                  `🔴 The **${MODES[mode].name}** waitlist is currently closed.`,
                ephemeral: true
              });
            }

            if (
              hasCooldown(
                interaction.user.id,
                mode
              )
            ) {
              const remaining =
                getRemainingCooldown(
                  interaction.user.id,
                  mode
                );

              return interaction.reply({
                content:
                  `⏱️ You have a cooldown for **${MODES[mode].name}**.\nRemaining: **${formatDuration(
                    remaining
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
                  "⚠️ You are already in this waitlist.",
                ephemeral: true
              });
            }

            db.waitlists[mode].push(
              interaction.user.id
            );

            saveDB();

            await updateWaitlistChannel(
              interaction.channel,
              mode
            );

            return interaction.reply({
              content:
                `✅ You joined the **${MODES[mode].name}** waitlist.`,
              ephemeral: true
            });
          }

          // LEAVE
          if (action === "leave") {
            db.waitlists[mode] =
              db.waitlists[mode].filter(
                id =>
                  id !==
                  interaction.user.id
              );

            saveDB();

            await updateWaitlistChannel(
              interaction.channel,
              mode
            );

            return interaction.reply({
              content:
                `✅ You left the **${MODES[mode].name}** waitlist.`,
              ephemeral: true
            });
          }

          // VIEW
          if (action === "view") {
            const queue =
              db.waitlists[mode];

            const list =
              queue.length
                ? queue
                    .map(
                      (id, index) =>
                        `**${index + 1}.** <@${id}>`
                    )
                    .join("\n")
                : "*The queue is empty.*";

            return interaction.reply({
              embeds: [
                new EmbedBuilder()
                  .setColor(
                    MODES[mode].color
                  )
                  .setTitle(
                    `${MODES[mode].emoji} ${MODES[mode].name} Queue`
                  )
                  .setDescription(
                    list
                  )
                  .setFooter({
                    text: `${queue.length} player(s) waiting`
                  })
              ],
              ephemeral: true
            });
          }
        }

        // =================================================
        // CLOSE TICKET
        // =================================================

        if (
          interaction.customId ===
          "ticket:close"
        ) {
          if (!isStaff(interaction.member)) {
            return interaction.reply({
              content:
                "❌ You do not have permission to close this ticket.",
              ephemeral: true
            });
          }

          await interaction.reply({
            content:
              "🔒 Ticket closing...",
            ephemeral: false
          });

          setTimeout(async () => {
            await interaction.channel
              .delete()
              .catch(() => {});
          }, 5000);

          return;
        }
      }

      // =================================================
      // ROLE MENUS
      // =================================================

      if (
        interaction.isStringSelectMenu()
      ) {
        // REGION
        if (
          interaction.customId ===
          "roles:region"
        ) {
          const selected =
            interaction.values[0];

          const allRoles =
            REGION_ROLES
              .map(
                roleData =>
                  interaction.guild.roles.cache.find(
                    role =>
                      role.name ===
                      roleData.name
                  )
              )
              .filter(Boolean);

          for (const role of allRoles) {
            if (role.name !== selected) {
              await interaction.member.roles
                .remove(role)
                .catch(() => {});
            }
          }

          const selectedRole =
            interaction.guild.roles.cache.find(
              role =>
                role.name ===
                selected
            );

          if (selectedRole) {
            await interaction.member.roles
              .add(selectedRole)
              .catch(() => {});
          }

          return interaction.reply({
            content:
              `🌍 Region set to **${selected}**.`,
            ephemeral: true
          });
        }

        // PINGS
        if (
          interaction.customId ===
          "roles:pings"
        ) {
          const selected =
            interaction.values;

          for (const roleData of PING_ROLES) {
            const role =
              interaction.guild.roles.cache.find(
                r =>
                  r.name ===
                  roleData.name
              );

            if (!role) continue;

            if (
              selected.includes(
                role.name
              )
            ) {
              await interaction.member.roles
                .add(role)
                .catch(() => {});
            } else {
              await interaction.member.roles
                .remove(role)
                .catch(() => {});
            }
          }

          return interaction.reply({
            content:
              "🔔 Notification roles updated.",
            ephemeral: true
          });
        }

        // MODALITIES
        if (
          interaction.customId ===
          "roles:modalities"
        ) {
          const selected =
            interaction.values;

          for (const [mode, info] of Object.entries(
            MODES
          )) {
            const role =
              interaction.guild.roles.cache.find(
                r =>
                  r.name ===
                  `${info.emoji} ${info.name}`
              );

            if (!role) continue;

            if (selected.includes(mode)) {
              await interaction.member.roles
                .add(role)
                .catch(() => {});
            } else {
              await interaction.member.roles
                .remove(role)
                .catch(() => {});
            }
          }

          return interaction.reply({
            content:
              "🎮 Modality roles updated.",
            ephemeral: true
          });
        }

        // =================================================
        // TICKET TYPE
        // =================================================

        if (
          interaction.customId ===
          "ticket:type"
        ) {
          const type =
            interaction.values[0];

          const category =
            interaction.guild.channels.cache.find(
              channel =>
                channel.type ===
                  ChannelType.GuildCategory &&
                channel.name ===
                  "🎫 TICKETS"
            );

          if (!category) {
            return interaction.reply({
              content:
                "❌ Ticket category not found. Run `/setup` first.",
              ephemeral: true
            });
          }

          const existing =
            interaction.guild.channels.cache.find(
              channel =>
                channel.topic ===
                `ticket-owner:${interaction.user.id}`
            );

          if (existing) {
            return interaction.reply({
              content:
                `❌ You already have an open ticket: ${existing}`,
              ephemeral: true
            });
          }

          const typeNames = {
            support: "support",
            tester: "tester-application",
            staff: "staff-application",
            high: "high-test"
          };

          const channel =
            await interaction.guild.channels.create({
              name: `${typeNames[type]}-${interaction.user.username}`
                .toLowerCase()
                .replace(/[^a-z0-9-]/g, "")
                .slice(0, 90),

              type: ChannelType.GuildText,

              parent: category.id,

              topic:
                `ticket-owner:${interaction.user.id}`,

              permissionOverwrites: [
                {
                  id:
                    interaction.guild.id,
                  deny: [
                    PermissionFlagsBits.ViewChannel
                  ]
                },
                {
                  id:
                    interaction.user.id,
                  allow: [
                    PermissionFlagsBits.ViewChannel,
                    PermissionFlagsBits.SendMessages,
                    PermissionFlagsBits.ReadMessageHistory
                  ]
                }
              ]
            });

          // Add staff permissions
          for (const roleData of STAFF_ROLES) {
            const role =
              interaction.guild.roles.cache.find(
                r =>
                  r.name ===
                  roleData.name
              );

            if (role) {
              await channel.permissionOverwrites
                .edit(role.id, {
                  ViewChannel: true,
                  SendMessages: true,
                  ReadMessageHistory: true
                })
                .catch(() => {});
            }
          }

          await channel.send({
            content:
              `${interaction.user}`,
            embeds: [
              new EmbedBuilder()
                .setColor(0x5865f2)
                .setTitle(
                  "🎫 Ticket Opened"
                )
                .setDescription(
                  [
                    `Welcome ${interaction.user}!`,
                    "",
                    `**Type:** ${typeNames[type]}`,
                    "",
                    "Please explain your request.",
                    "",
                    type === "high"
                      ? "🏆 High Tests are requested through Support."
                      : "A member of staff will assist you shortly."
                  ].join("\n")
                )
                .setFooter({
                  text: "Summer Tier List Support"
                })
            ],
            components: [
              buildCloseTicketButton()
            ]
          });

          return interaction.reply({
            content:
              `✅ Your ticket has been created: ${channel}`,
            ephemeral: true
          });
        }
      }
    } catch (error) {
      console.error(
        "❌ Interaction error:",
        error
      );

      if (
        interaction.replied ||
        interaction.deferred
      ) {
        await interaction
          .followUp({
            content:
              "❌ An unexpected error occurred.",
            ephemeral: true
          })
          .catch(() => {});
      } else {
        await interaction
          .reply({
            content:
              "❌ An unexpected error occurred.",
            ephemeral: true
          })
          .catch(() => {});
      }
    }
  }
);

// =====================================================
// LOGIN
// =====================================================

client.login(TOKEN);
