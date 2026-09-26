```js
require("dotenv").config();

const fs = require("node:fs");
const path = require("node:path");

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

/* =========================================================
   CONFIG
========================================================= */

const TOKEN =
  process.env.DISCORD_TOKEN ||
  process.env.TOKEN;

const CLIENT_ID =
  process.env.CLIENT_ID;

const GUILD_ID =
  process.env.GUILD_ID;

if (!TOKEN || !CLIENT_ID || !GUILD_ID) {
  console.error(
    "❌ Faltan DISCORD_TOKEN, CLIENT_ID o GUILD_ID."
  );
  process.exit(1);
}

const DB_FILE =
  path.join(__dirname, "database.json");

/* =========================================================
   MODALIDADES
========================================================= */

const MODES = {
  netpot: {
    name: "NetPot",
    emoji: "🟠",
    color: 0xff8c00,
    channel: "🟠・netpot-waitlist"
  },

  uhc: {
    name: "UHC",
    emoji: "🧪",
    color: 0x2ecc71,
    channel: "🧪・uhc-waitlist"
  },

  sword: {
    name: "Sword",
    emoji: "⚔️",
    color: 0x3498db,
    channel: "⚔️・sword-waitlist"
  },

  boxpvp: {
    name: "BoxPvP",
    emoji: "📦",
    color: 0x9b59b6,
    channel: "📦・boxpvp-waitlist"
  },

  crystalpvp: {
    name: "CrystalPvP",
    emoji: "💎",
    color: 0x00d9ff,
    channel: "💎・crystalpvp-waitlist"
  }
};

const MODE_KEYS =
  Object.keys(MODES);

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

const COOLDOWN_TIME =
  3 * 24 * 60 * 60 * 1000;

/* =========================================================
   ROLES
========================================================= */

const STAFF_ROLES = [
  {
    name: "👑 Owner",
    color: 0xf1c40f,
    hoist: true
  },
  {
    name: "🛡️ Administrator",
    color: 0xe74c3c,
    hoist: true
  },
  {
    name: "🔨 Moderator",
    color: 0xe67e22,
    hoist: true
  },
  {
    name: "🛠️ Helper",
    color: 0x2ecc71,
    hoist: true
  },
  {
    name: "💎 Tierlist Manager",
    color: 0x00bfff,
    hoist: true
  },
  {
    name: "🏆 High Tester",
    color: 0xff0000,
    hoist: true
  },
  {
    name: "🧪 Senior Tester",
    color: 0x9b59b6,
    hoist: true
  },
  {
    name: "⚔️ Tester",
    color: 0x3498db,
    hoist: true
  },
  {
    name: "📋 Trial Tester",
    color: 0x1abc9c,
    hoist: true
  },
  {
    name: "🎫 Support",
    color: 0x2ecc71,
    hoist: true
  },
  {
    name: "🧑‍💻 Developer",
    color: 0x34495e,
    hoist: true
  },
  {
    name: "🤝 Partner",
    color: 0xf39c12,
    hoist: false
  },
  {
    name: "📝 Staff Applicant",
    color: 0x95a5a6,
    hoist: false
  }
];

const REGION_ROLES = [
  {
    name: "🇺🇸 North America",
    color: 0x3498db
  },
  {
    name: "🇪🇺 Europe",
    color: 0x5865f2
  },
  {
    name: "🇧🇷 South America",
    color: 0x2ecc71
  },
  {
    name: "🌏 Asia",
    color: 0xe74c3c
  },
  {
    name: "🇦🇺 Oceania",
    color: 0x9b59b6
  },
  {
    name: "🌍 Other",
    color: 0x95a5a6
  }
];

const PING_ROLES = [
  {
    name: "📢 Announcements",
    color: 0xf1c40f
  },
  {
    name: "🧪 Testing",
    color: 0x3498db
  },
  {
    name: "🏆 Results",
    color: 0x2ecc71
  },
  {
    name: "🎫 Support",
    color: 0x9b59b6
  },
  {
    name: "🎬 Media",
    color: 0xe67e22
  },
  {
    name: "🏅 Events",
    color: 0xe74c3c
  }
];

/* =========================================================
   DATABASE
========================================================= */

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
  try {
    if (!fs.existsSync(DB_FILE)) {
      const database =
        defaultDatabase();

      fs.writeFileSync(
        DB_FILE,
        JSON.stringify(
          database,
          null,
          2
        ),
        "utf8"
      );

      return database;
    }

    const raw =
      fs.readFileSync(
        DB_FILE,
        "utf8"
      );

    const database =
      raw.trim()
        ? JSON.parse(raw)
        : defaultDatabase();

    const defaults =
      defaultDatabase();

    for (
      const key
      of Object.keys(defaults)
    ) {
      if (
        database[key] === undefined
      ) {
        database[key] =
          defaults[key];
      }
    }

    for (
      const mode
      of MODE_KEYS
    ) {
      database.waitlists[mode] ??= [];
      database.waitlistStatus[mode] ??= true;
      database.testers[mode] ??= [];
    }

    database.cooldowns ??= {};
    database.results ??= [];
    database.highResults ??= [];
    database.tickets ??= [];
    database.applications ??= [];
    database.profiles ??= {};
    database.setupChannels ??= {};

    return database;

  } catch (error) {
    console.error(
      "❌ Error leyendo database.json:",
      error
    );

    return defaultDatabase();
  }
}

function saveDB(database = db) {
  fs.writeFileSync(
    DB_FILE,
    JSON.stringify(
      database,
      null,
      2
    ),
    "utf8"
  );
}

let db = loadDB();

/* =========================================================
   HELPERS
========================================================= */

function modeInfo(mode) {
  return MODES[mode];
}

function getModeName(mode) {
  return MODES[mode]?.name || mode;
}

function getCooldownKey(
  userId,
  mode
) {
  return `${userId}:${mode}`;
}

function getCooldown(
  userId,
  mode
) {
  return (
    db.cooldowns[
      getCooldownKey(
        userId,
        mode
      )
    ] || 0
  );
}

function setCooldown(
  userId,
  mode
) {
  db.cooldowns[
    getCooldownKey(
      userId,
      mode
    )
  ] =
    Date.now() +
    COOLDOWN_TIME;

  saveDB();
}

function removeCooldown(
  userId,
  mode
) {
  delete db.cooldowns[
    getCooldownKey(
      userId,
      mode
    )
  ];

  saveDB();
}

function formatRemaining(ms) {
  if (ms <= 0) {
    return "0 minutos";
  }

  const days =
    Math.floor(
      ms / 86400000
    );

  const hours =
    Math.floor(
      (ms % 86400000) /
      3600000
    );

  const minutes =
    Math.floor(
      (ms % 3600000) /
      60000
    );

  const parts = [];

  if (days) {
    parts.push(
      `${days}d`
    );
  }

  if (hours) {
    parts.push(
      `${hours}h`
    );
  }

  if (minutes) {
    parts.push(
      `${minutes}m`
    );
  }

  return (
    parts.join(" ") ||
    "<1m"
  );
}

function cleanUsername(username) {
  const cleaned =
    username
      .toLowerCase()
      .replace(
        /[^a-z0-9-]/g,
        ""
      );

  return (
    cleaned ||
    "user"
  );
}

/* =========================================================
   STAFF / TESTERS
========================================================= */

function hasRole(
  member,
  roleNames
) {
  if (!member) return false;

  if (
    member.permissions.has(
      PermissionFlagsBits.Administrator
    )
  ) {
    return true;
  }

  return member.roles.cache.some(
    role =>
      roleNames.includes(
        role.name
      )
  );
}

function isStaff(member) {
  return hasRole(
    member,
    [
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
      "🧑‍💻 Developer"
    ]
  );
}

function canManageWaitlist(
  member
) {
  return hasRole(
    member,
    [
      "👑 Owner",
      "🛡️ Administrator",
      "💎 Tierlist Manager",
      "🏆 High Tester",
      "🧪 Senior Tester",
      "⚔️ Tester"
    ]
  );
}

function canRemoveCooldown(
  member
) {
  return hasRole(
    member,
    [
      "👑 Owner",
      "🛡️ Administrator",
      "🔨 Moderator",
      "🛠️ Helper",
      "💎 Tierlist Manager",
      "🏆 High Tester",
      "🧪 Senior Tester",
      "⚔️ Tester",
      "🎫 Support",
      "🧑‍💻 Developer"
    ]
  );
}

function canResult(
  member,
  mode
) {
  if (!member) {
    return false;
  }

  if (
    member.permissions.has(
      PermissionFlagsBits.Administrator
    )
  ) {
    return true;
  }

  if (
    member.roles.cache.some(
      role =>
        [
          "👑 Owner",
          "🛡️ Administrator",
          "💎 Tierlist Manager",
          "🏆 High Tester",
          "🧪 Senior Tester"
        ].includes(
          role.name
        )
    )
  ) {
    return true;
  }

  return (
    db.testers[mode] ||
    []
  ).includes(
    member.id
  );
}

function canHighResult(
  member
) {
  return hasRole(
    member,
    [
      "👑 Owner",
      "🛡️ Administrator",
      "💎 Tierlist Manager",
      "🏆 High Tester"
    ]
  );
}

/* =========================================================
   CLIENT
========================================================= */

const client =
  new Client({
    intents: [
      GatewayIntentBits.Guilds
    ]
  });

/* =========================================================
   COMMANDS
========================================================= */

const commands = [

  new SlashCommandBuilder()
    .setName("ping")
    .setDescription(
      "Comprueba la conexión del bot."
    ),

  new SlashCommandBuilder()
    .setName("setup")
    .setDescription(
      "Configura todo Summer Tier List."
    )
    .setDefaultMemberPermissions(
      PermissionFlagsBits.Administrator
    ),

  new SlashCommandBuilder()
    .setName("setupwaitlist")
    .setDescription(
      "Configura las waitlists."
    )
    .setDefaultMemberPermissions(
      PermissionFlagsBits.Administrator
    ),

  new SlashCommandBuilder()
    .setName("roles")
    .setDescription(
      "Publica el panel de selección de roles."
    )
    .setDefaultMemberPermissions(
      PermissionFlagsBits.Administrator
    ),

  new SlashCommandBuilder()
    .setName("waitlist")
    .setDescription(
      "Activa o desactiva una waitlist."
    )
    .addStringOption(option =>
      option
        .setName("modalidad")
        .setDescription(
          "Modalidad"
        )
        .setRequired(true)
        .addChoices(
          ...MODE_KEYS.map(
            mode => ({
              name:
                `${MODES[mode].emoji} ${MODES[mode].name}`,
              value: mode
            })
          )
        )
    )
    .addStringOption(option =>
      option
        .setName("estado")
        .setDescription(
          "Estado"
        )
        .setRequired(true)
        .addChoices(
          {
            name:
              "🟢 Encender",
            value: "on"
          },
          {
            name:
              "🔴 Apagar",
            value: "off"
          }
        )
    ),

  new SlashCommandBuilder()
    .setName("settester")
    .setDescription(
      "Asigna a un usuario como tester de una modalidad."
    )
    .addUserOption(option =>
      option
        .setName("usuario")
        .setDescription(
          "Usuario"
        )
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName("modalidad")
        .setDescription(
          "Modalidad"
        )
        .setRequired(true)
        .addChoices(
          ...MODE_KEYS.map(
            mode => ({
              name:
                `${MODES[mode].emoji} ${MODES[mode].name}`,
              value: mode
            })
          )
        )
    ),

  new SlashCommandBuilder()
    .setName("removetester")
    .setDescription(
      "Quita un tester de una modalidad."
    )
    .addUserOption(option =>
      option
        .setName("usuario")
        .setDescription(
          "Usuario"
        )
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName("modalidad")
        .setDescription(
          "Modalidad"
        )
        .setRequired(true)
        .addChoices(
          ...MODE_KEYS.map(
            mode => ({
              name:
                `${MODES[mode].emoji} ${MODES[mode].name}`,
              value: mode
            })
          )
        )
    ),

  new SlashCommandBuilder()
    .setName("result")
    .setDescription(
      "Registra un resultado."
    )
    .addUserOption(option =>
      option
        .setName("jugador")
        .setDescription(
          "Jugador"
        )
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName("modalidad")
        .setDescription(
          "Modalidad"
        )
        .setRequired(true)
        .addChoices(
          ...MODE_KEYS.map(
            mode => ({
              name:
                `${MODES[mode].emoji} ${MODES[mode].name}`,
              value: mode
            })
          )
        )
    )
    .addStringOption(option =>
      option
        .setName("tier")
        .setDescription(
          "Tier"
        )
        .setRequired(true)
        .addChoices(
          ...TIERS.map(
            tier => ({
              name: tier,
              value: tier
            })
          )
        )
    )
    .addStringOption(option =>
      option
        .setName("minecraft")
        .setDescription(
          "Minecraft IGN"
        )
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("highresult")
    .setDescription(
      "Registra un High Test."
    )
    .addUserOption(option =>
      option
        .setName("jugador")
        .setDescription(
          "Jugador"
        )
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName("modalidad")
        .setDescription(
          "Modalidad"
        )
        .setRequired(true)
        .addChoices(
          ...MODE_KEYS.map(
            mode => ({
              name:
                `${MODES[mode].emoji} ${MODES[mode].name}`,
              value: mode
            })
          )
        )
    )
    .addStringOption(option =>
      option
        .setName("tier")
        .setDescription(
          "Tier"
        )
        .setRequired(true)
        .addChoices(
          ...TIERS.map(
            tier => ({
              name: tier,
              value: tier
            })
          )
        )
    )
    .addStringOption(option =>
      option
        .setName("minecraft")
        .setDescription(
          "Minecraft IGN"
        )
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("removecooldown")
    .setDescription(
      "Elimina el cooldown de un jugador."
    )
    .addUserOption(option =>
      option
        .setName("jugador")
        .setDescription(
          "Jugador"
        )
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName("modalidad")
        .setDescription(
          "Modalidad"
        )
        .setRequired(true)
        .addChoices(
          ...MODE_KEYS.map(
            mode => ({
              name:
                `${MODES[mode].emoji} ${MODES[mode].name}`,
              value: mode
            })
          )
        )
    ),

  new SlashCommandBuilder()
    .setName("results")
    .setDescription(
      "Muestra resultados recientes."
    ),

  new SlashCommandBuilder()
    .setName("queue")
    .setDescription(
      "Muestra una waitlist."
    )
    .addStringOption(option =>
      option
        .setName("modalidad")
        .setDescription(
          "Modalidad"
        )
        .setRequired(true)
        .addChoices(
          ...MODE_KEYS.map(
            mode => ({
              name:
                `${MODES[mode].emoji} ${MODES[mode].name}`,
              value: mode
            })
          )
        )
    ),

  new SlashCommandBuilder()
    .setName("profile")
    .setDescription(
      "Muestra el perfil de un jugador."
    )
    .addUserOption(option =>
      option
        .setName("jugador")
        .setDescription(
          "Jugador"
        )
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("support")
    .setDescription(
      "Muestra el sistema de soporte."
    ),

  new SlashCommandBuilder()
    .setName("staffsetup")
    .setDescription(
      "Crea los roles oficiales de staff."
    )
    .setDefaultMemberPermissions(
      PermissionFlagsBits.Administrator
    ),

  new SlashCommandBuilder()
    .setName("reset")
    .setDescription(
      "Reinicia la estructura de Summer Tier List."
    )
    .setDefaultMemberPermissions(
      PermissionFlagsBits.Administrator
    )

].map(
  command =>
    command.toJSON()
  );

/* =========================================================
   REGISTER COMMANDS
========================================================= */

async function registerCommands() {
  try {

    console.log(
      "🔄 Registrando comandos..."
    );

    const rest =
      new REST({
        version: "10"
      }).setToken(
        TOKEN
      );

    await rest.put(
      Routes.applicationGuildCommands(
        CLIENT_ID,
        GUILD_ID
      ),
      {
        body: commands
      }
    );

    console.log(
      `✅ ${commands.length} comandos registrados.`
    );

  } catch (error) {

    console.error(
      "❌ Error registrando comandos:",
      error
    );
  }
}

/* =========================================================
   CREATE ROLES
========================================================= */

async function createStaffRoles(
  guild
) {

  for (
    const roleData
    of STAFF_ROLES
  ) {

    if (
      guild.roles.cache.some(
        role =>
          role.name ===
          roleData.name
      )
    ) {
      continue;
    }

    try {

      await guild.roles.create({
        name:
          roleData.name,
        color:
          roleData.color,
        hoist:
          roleData.hoist,
        mentionable:
          true,
        reason:
          "Summer Tier List staff setup"
      });

    } catch (error) {

      console.error(
        `❌ Error creando ${roleData.name}:`,
        error.message
      );
    }
  }
}

async function createCommunityRoles(
  guild
) {

  const allRoles = [
    ...REGION_ROLES,
    ...PING_ROLES
  ];

  for (
    const roleData
    of allRoles
  ) {

    if (
      guild.roles.cache.some(
        role =>
          role.name ===
          roleData.name
      )
    ) {
      continue;
    }

    try {

      await guild.roles.create({
        name:
          roleData.name,
        color:
          roleData.color,
        hoist:
          false,
        mentionable:
          true,
        reason:
          "Summer Tier List community roles"
      });

    } catch (error) {

      console.error(
        `❌ Error creando ${roleData.name}:`,
        error.message
      );
    }
  }

  for (
    const mode
    of MODE_KEYS
  ) {

    const info =
      MODES[mode];

    const roleName =
      `${info.emoji} ${info.name}`;

    if (
      guild.roles.cache.some(
        role =>
          role.name ===
          roleName
      )
    ) {
      continue;
    }

    try {

      await guild.roles.create({
        name:
          roleName,
        color:
          info.color,
        hoist:
          false,
        mentionable:
          true,
        reason:
          "Summer Tier List modality role"
      });

    } catch (error) {

      console.error(
        `❌ Error creando ${roleName}:`,
        error.message
      );
    }
  }
}

async function createTierRoles(
  guild
) {

  for (
    const mode
    of MODE_KEYS
  ) {

    const info =
      MODES[mode];

    for (
      const tier
      of TIERS
    ) {

      const roleName =
        `${info.emoji} ${info.name} ${tier}`;

      if (
        guild.roles.cache.some(
          role =>
            role.name ===
            roleName
        )
      ) {
        continue;
      }

      try {

        await guild.roles.create({
          name:
            roleName,
          color:
            info.color,
          hoist:
            false,
          mentionable:
            true,
          reason:
            "Summer Tier List tier role"
        });

      } catch (error) {

        console.error(
          `❌ Error creando ${roleName}:`,
          error.message
        );
      }
    }
  }
}

/* =========================================================
   CATEGORIES
========================================================= */

async function getOrCreateCategory(
  guild,
  name
) {

  let category =
    guild.channels.cache.find(
      channel =>
        channel.type ===
          ChannelType.GuildCategory &&
        channel.name ===
          name
    );

  if (!category) {

    category =
      await guild.channels.create({
        name,
        type:
          ChannelType.GuildCategory
      });
  }

  return category;
}

/* =========================================================
   GENERAL CHANNEL
========================================================= */

async function getOrCreateTextChannel(
  guild,
  name,
  category
) {

  let channel =
    guild.channels.cache.find(
      c =>
        c.type ===
          ChannelType.GuildText &&
        c.name ===
          name
    );

  if (!channel) {

    channel =
      await guild.channels.create({
        name,
        type:
          ChannelType.GuildText,
        parent:
          category.id
      });

  } else if (
    channel.parentId !==
    category.id
  ) {

    await channel.setParent(
      category.id
    );
  }

  return channel;
}

/* =========================================================
   WAITLIST CHANNEL
========================================================= */

async function createWaitlistChannel(
  guild,
  category,
  mode
) {

  const info =
    MODES[mode];

  const channelName =
    info.channel;

  let channel =
    guild.channels.cache.find(
      c =>
        c.type ===
          ChannelType.GuildText &&
        (
          c.name ===
            channelName ||
          c.name ===
            `${mode}-waitlist`
        )
    );

  if (!channel) {

    channel =
      await guild.channels.create({
        name:
          channelName,
        type:
          ChannelType.GuildText,
        parent:
          category.id
      });

  } else {

    if (
      channel.name !==
      channelName
    ) {

      await channel.setName(
        channelName
      );
    }

    if (
      channel.parentId !==
      category.id
    ) {

      await channel.setParent(
        category.id
      );
    }
  }

  await ensureWaitlistPanel(
    channel,
    mode
  );

  return channel;
}

/* =========================================================
   WAITLIST EMBED
========================================================= */

function buildWaitlistEmbed(
  mode
) {

  const info =
    MODES[mode];

  const queue =
    db.waitlists[mode] ||
    [];

  const active =
    db.waitlistStatus[mode];

  const testers =
    db.testers[mode] ||
    [];

  let queueText =
    "📭 No players waiting.";

  if (queue.length) {

    queueText =
      queue
        .map(
          (id, index) =>
            `**${index + 1}.** <@${id}>`
        )
        .join("\n");
  }

  return new EmbedBuilder()
    .setColor(
      active
        ? info.color
        : 0xe74c3c
    )
    .setTitle(
      `${info.emoji} ${info.name.toUpperCase()}`
    )
    .setDescription(
      [
        "## ☀️ SUMMER TIER LIST",
        "",
        `### ${info.emoji} OFFICIAL ${info.name} WAITLIST`,
        "",
        active
          ? "🟢 **QUEUE OPEN**"
          : "🔴 **QUEUE CLOSED**",
        "",
        "Prove your skill.",
        "Earn your tier.",
        "Build your legacy.",
        "",
        "━━━━━━━━━━━━━━━━━━━━",
        "",
        `👥 **Players Waiting:** \`${queue.length}\``,
        `🧪 **Available Testers:** \`${testers.length}\``,
        "",
        "### 📋 QUEUE",
        queueText,
        "",
        "━━━━━━━━━━━━━━━━━━━━",
        "",
        "⏱️ **Cooldown:** 3 days after an official result.",
        "🎫 Tickets are opened manually by staff.",
        "",
        "━━━━━━━━━━━━━━━━━━━━",
        "",
        "☀️ **Summer Tier List**",
        "Official Minecraft PvP Testing"
      ].join("\n")
    )
    .setFooter({
      text:
        `Summer Tier List • ${info.name}`
    })
    .setTimestamp();
}

function buildWaitlistButtons(
  mode
) {

  const active =
    db.waitlistStatus[mode];

  return new ActionRowBuilder()
    .addComponents(

      new ButtonBuilder()
        .setCustomId(
          `waitlist:join:${mode}`
        )
        .setLabel(
          "Join Waitlist"
        )
        .setEmoji("➕")
        .setStyle(
          ButtonStyle.Success
        )
        .setDisabled(
          !active
        ),

      new ButtonBuilder()
        .setCustomId(
          `waitlist:leave:${mode}`
        )
        .setLabel(
          "Leave"
        )
        .setEmoji("➖")
        .setStyle(
          ButtonStyle.Danger
        ),

      new ButtonBuilder()
        .setCustomId(
          `waitlist:view:${mode}`
        )
        .setLabel(
          "View Queue"
        )
        .setEmoji("👥")
        .setStyle(
          ButtonStyle.Secondary
        )
    );
}

async function ensureWaitlistPanel(
  channel,
  mode
) {

  let messages;

  try {

    messages =
      await channel.messages.fetch({
        limit: 50
      });

  } catch {

    return;
  }

  const footer =
    `Summer Tier List • ${MODES[mode].name}`;

  const existing =
    messages.find(
      message =>
        message.author.id ===
          client.user.id &&
        message.embeds.length > 0 &&
        message.embeds[0].footer?.text ===
          footer
    );

  if (existing) {

    await existing.edit({
      embeds: [
        buildWaitlistEmbed(
          mode
        )
      ],
      components: [
        buildWaitlistButtons(
          mode
        )
      ]
    });

    return;
  }

  await channel.send({
    embeds: [
      buildWaitlistEmbed(
        mode
      )
    ],
    components: [
      buildWaitlistButtons(
        mode
      )
    ]
  });
}

async function updateAllWaitlistPanels(
  guild
) {

  for (
    const mode
    of MODE_KEYS
  ) {

    const channel =
      guild.channels.cache.find(
        c =>
          c.type ===
            ChannelType.GuildText &&
          c.name ===
            MODES[mode].channel
      );

    if (!channel) {
      continue;
    }

    await ensureWaitlistPanel(
      channel,
      mode
    );
  }
}

/* =========================================================
   ROLE PANEL
========================================================= */

function buildRolePanel() {

  const embed =
    new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(
        "☀️ SUMMER TIER LIST"
      )
      .setDescription(
        [
          "## 🎛️ PERSONAL ROLES",
          "",
          "Selecciona tus roles para personalizar tu experiencia.",
          "",
          "🌎 **REGION**",
          "Selecciona la región donde juegas.",
          "",
          "🔔 **NOTIFICATIONS**",
          "Elige qué anuncios quieres recibir.",
          "",
          "🎮 **MODALITIES**",
          "Selecciona las modalidades que juegas.",
          "",
          "━━━━━━━━━━━━━━━━━━━━",
          "",
          "Puedes cambiar tus selecciones cuando quieras.",
          "",
          "☀️ **Summer Tier List**",
          "Official Minecraft PvP Testing"
        ].join("\n")
      )
      .setFooter({
        text:
          "Summer Tier List • Role Selection"
      })
      .setTimestamp();

  const regionMenu =
    new StringSelectMenuBuilder()
      .setCustomId(
        "roles:region"
      )
      .setPlaceholder(
        "🌎 Selecciona tu región"
      )
      .setMinValues(1)
      .setMaxValues(1)
      .addOptions(
        REGION_ROLES.map(
          role => ({
            label:
              role.name
                .replace(
                  /^.{2}/u,
                  ""
                )
                .trim(),
            value:
              role.name,
            emoji:
              role.name.slice(0, 2)
          })
        )
      );

  const pingMenu =
    new StringSelectMenuBuilder()
      .setCustomId(
        "roles:pings"
      )
      .setPlaceholder(
        "🔔 Selecciona tus pings"
      )
      .setMinValues(0)
      .setMaxValues(
        PING_ROLES.length
      )
      .addOptions(
        PING_ROLES.map(
          role => ({
            label:
              role.name
                .replace(
                  /^.{2}/u,
                  ""
                )
                .trim(),
            value:
              role.name,
            emoji:
              role.name.slice(0, 2)
          })
        )
      );

  const modeMenu =
    new StringSelectMenuBuilder()
      .setCustomId(
        "roles:modalities"
      )
      .setPlaceholder(
        "🎮 Selecciona tus modalidades"
      )
      .setMinValues(0)
      .setMaxValues(
        MODE_KEYS.length
      )
      .addOptions(
        MODE_KEYS.map(
          mode => ({
            label:
              MODES[mode].name,
            value:
              mode,
            emoji:
              MODES[mode].emoji
          })
        )
      );

  return {
    embed,
    components: [
      new ActionRowBuilder()
        .addComponents(
          regionMenu
        ),
      new ActionRowBuilder()
        .addComponents(
          pingMenu
        ),
      new ActionRowBuilder()
        .addComponents(
          modeMenu
        )
    ]
  };
}

async function createRolePanel(
  guild
) {

  const category =
    await getOrCreateCategory(
      guild,
      "🔔 ROLES"
    );

  const channel =
    await getOrCreateTextChannel(
      guild,
      "🔔・roles",
      category
    );

  let messages;

  try {

    messages =
      await channel.messages.fetch({
        limit: 50
      });

  } catch {

    return channel;
  }

  const existing =
    messages.find(
      message =>
        message.author.id ===
          client.user.id &&
        message.embeds.length > 0 &&
        message.embeds[0].footer?.text ===
          "Summer Tier List • Role Selection"
    );

  const panel =
    buildRolePanel();

  if (existing) {

    await existing.edit({
      embeds: [
        panel.embed
      ],
      components:
        panel.components
    });

  } else {

    await channel.send({
      embeds: [
        panel.embed
      ],
      components:
        panel.components
    });
  }

  return channel;
}

/* =========================================================
   TICKET PANEL
========================================================= */

async function createTicketPanel(
  guild
) {

  const category =
    await getOrCreateCategory(
      guild,
      "🎫 TICKETS"
    );

  const channel =
    await getOrCreateTextChannel(
      guild,
      "🎫・ticket-panel",
      category
    );

  let messages;

  try {

    messages =
      await channel.messages.fetch({
        limit: 50
      });

  } catch {

    return channel;
  }

  const existing =
    messages.find(
      message =>
        message.author.id ===
          client.user.id &&
        message.embeds.length > 0 &&
        message.embeds[0].footer?.text ===
          "Summer Tier List • Ticket Panel"
    );

  if (existing) {
    return channel;
  }

  const embed =
    new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(
        "🎫 SUMMER TIER LIST"
      )
      .setDescription(
        [
          "## SUPPORT & APPLICATIONS",
          "",
          "Necesitas ayuda, quieres aplicar o solicitar un High Test?",
          "",
          "Selecciona la opción correspondiente.",
          "",
          "━━━━━━━━━━━━━━━━━━━━",
          "",
          "🛡️ **Support**",
          "Ayuda general, problemas o dudas.",
          "",
          "🧪 **Tester Application**",
          "Aplicar para Tester.",
          "",
          "👑 **Staff Application**",
          "Aplicar para Staff.",
          "",
          "🔥 **High Test**",
          "Solicitar un High Test mediante soporte.",
          "",
          "━━━━━━━━━━━━━━━━━━━━",
          "",
          "🔒 Un ticket abierto por usuario.",
          "🤝 Respeta al staff."
        ].join("\n")
      )
      .setFooter({
        text:
          "Summer Tier List • Ticket Panel"
      })
      .setTimestamp();

  const button =
    new ButtonBuilder()
      .setCustomId(
        "ticket:open"
      )
      .setLabel(
        "Open Ticket"
      )
      .setEmoji("🎫")
      .setStyle(
        ButtonStyle.Primary
      );

  await channel.send({
    embeds: [
      embed
    ],
    components: [
      new ActionRowBuilder()
        .addComponents(
          button
        )
    ]
  });

  return channel;
}

/* =========================================================
   STAFF LOGS
========================================================= */

async function logStaffAction(
  guild,
  title,
  description,
  color = 0x5865f2
) {

  const channel =
    guild.channels.cache.find(
      c =>
        c.type ===
          ChannelType.GuildText &&
        c.name ===
          "📋・staff-logs"
    );

  if (!channel) {
    return;
  }

  const embed =
    new EmbedBuilder()
      .setColor(color)
      .setTitle(title)
      .setDescription(
        description
      )
      .setFooter({
        text:
          "Summer Tier List • Staff Logs"
      })
      .setTimestamp();

  await channel.send({
    embeds: [
      embed
    ]
  }).catch(() => {});
}

/* =========================================================
   SETUP SERVER
========================================================= */

async function setupServer(
  guild
) {

  console.log(
    "🔧 Configurando Summer Tier List..."
  );

  await createStaffRoles(
    guild
  );

  await createCommunityRoles(
    guild
  );

  await createTierRoles(
    guild
  );

  /* =========================
     MAIN
  ========================= */

  const mainCategory =
    await getOrCreateCategory(
      guild,
      "☀️ SUMMER TIER LIST"
    );

  for (
    const mode
    of MODE_KEYS
  ) {

    await createWaitlistChannel(
      guild,
      mainCategory,
      mode
    );
  }

  await getOrCreateTextChannel(
    guild,
    "📊・results",
    mainCategory
  );

  await getOrCreateTextChannel(
    guild,
    "🏆・high-results",
    mainCategory
  );

  await getOrCreateTextChannel(
    guild,
    "📢・announcements",
    mainCategory
  );

  await getOrCreateTextChannel(
    guild,
    "🆘・support",
    mainCategory
  );

  await getOrCreateTextChannel(
    guild,
    "📋・staff-logs",
    mainCategory
  );

  /* =========================
     INFORMATION
  ========================= */

  const information =
    await getOrCreateCategory(
      guild,
      "📌 INFORMATION"
    );

  await getOrCreateTextChannel(
    guild,
    "📜・rules",
    information
  );

  await getOrCreateTextChannel(
    guild,
    "📖・how-to-play",
    information
  );

  await getOrCreateTextChannel(
    guild,
    "🏆・tier-list",
    information
  );

  /* =========================
     ROLES
  ========================= */

  await createRolePanel(
    guild
  );

  /* =========================
     MEDIA
  ========================= */

  const media =
    await getOrCreateCategory(
      guild,
      "🎬 MEDIA"
    );

  await getOrCreateTextChannel(
    guild,
    "📸・screenshots",
    media
  );

  await getOrCreateTextChannel(
    guild,
    "🎥・clips",
    media
  );

  await getOrCreateTextChannel(
    guild,
    "🏅・highlights",
    media
  );

  await getOrCreateTextChannel(
    guild,
    "🖼️・media",
    media
  );

  await getOrCreateTextChannel(
    guild,
    "🎨・community-creations",
    media
  );

  /* =========================
     STAFF
  ========================= */

  const staff =
    await getOrCreateCategory(
      guild,
      "🛡️ STAFF"
    );

  await getOrCreateTextChannel(
    guild,
    "💬・staff-chat",
    staff
  );

  await getOrCreateTextChannel(
    guild,
    "📁・applications",
    staff
  );

  /* =========================
     TICKETS
  ========================= */

  await createTicketPanel(
    guild
  );

  await updateAllWaitlistPanels(
    guild
  );

  console.log(
    "✅ Setup terminado."
  );
}

/* =========================================================
   INTERACTIONS
========================================================= */

client.on(
  Events.InteractionCreate,
  async interaction => {

    try {

      /* ===================================================
         SLASH COMMANDS
      =================================================== */

      if (
        interaction.isChatInputCommand()
      ) {

        const command =
          interaction.commandName;

        /* =========================
           PING
        ========================= */

        if (
          command ===
          "ping"
        ) {

          await interaction.reply({
            content:
              `🏓 **Pong!**\n\nLatency: **${client.ws.ping}ms**`,
            ephemeral: true
          });

          return;
        }

        /* =========================
           SETUP
        ========================= */

        if (
          command ===
          "setup"
        ) {

          await interaction.deferReply({
            ephemeral: true
          });

          await setupServer(
            interaction.guild
          );

          await interaction.editReply(
            [
              "☀️ **SUMMER TIER LIST**",
              "",
              "╭────────────────────────╮",
              "│     ✦ SETUP COMPLETE ✦ │",
              "╰────────────────────────╯",
              "",
              "🟢 **Waitlists:** 5",
              "🎛️ **Role Selection:** Ready",
              "🔔 **Pings:** Ready",
              "🌎 **Regions:** Ready",
              "🎮 **Modalities:** Ready",
              "📊 **Results:** Ready",
              "🏆 **High Results:** Ready",
              "🎫 **Tickets:** Ready",
              "🎬 **Media:** Ready",
              "🛡️ **Staff:** Ready",
              "",
              "✨ Summer Tier List está configurado."
            ].join("\n")
          );

          return;
        }

        /* =========================
           SETUP WAITLIST
        ========================= */

        if (
          command ===
          "setupwaitlist"
        ) {

          if (
            !canManageWaitlist(
              interaction.member
            )
          ) {

            await interaction.reply({
              content:
                "❌ No tienes permiso para configurar las waitlists.",
              ephemeral: true
            });

            return;
          }

          await interaction.deferReply({
            ephemeral: true
          });

          await updateAllWaitlistPanels(
            interaction.guild
          );

          await interaction.editReply(
            "✅ **Las 5 waitlists fueron configuradas y actualizadas.**"
          );

          return;
        }

        /* =========================
           ROLES
        ========================= */

        if (
          command ===
          "roles"
        ) {

          await interaction.deferReply({
            ephemeral: true
          });

          await createRolePanel(
            interaction.guild
          );

          await interaction.editReply(
            "✅ **Panel de roles configurado en 🔔・roles.**"
          );

          return;
        }

        /* =========================
           WAITLIST
        ========================= */

        if (
          command ===
          "waitlist"
        ) {

          if (
            !canManageWaitlist(
              interaction.member
            )
          ) {

            await interaction.reply({
              content:
                "❌ No tienes permiso.",
              ephemeral: true
            });

            return;
          }

          const mode =
            interaction.options.getString(
              "modalidad"
            );

          const state =
            interaction.options.getString(
              "estado"
            );

          db.waitlistStatus[mode] =
            state === "on";

          saveDB();

          await updateAllWaitlistPanels(
            interaction.guild
          );

          await interaction.reply({
            content:
              `${MODES[mode].emoji} **${MODES[mode].name}** → ${
                state === "on"
                  ? "🟢 WAITLIST ACTIVADA"
                  : "🔴 WAITLIST DESACTIVADA"
              }`,
            ephemeral: true
          });

          return;
        }

        /* =========================
           SET TESTER
        ========================= */

        if (
          command ===
          "settester"
        ) {

          if (
            !hasRole(
              interaction.member,
              [
                "👑 Owner",
                "🛡️ Administrator",
                "💎 Tierlist Manager"
              ]
            )
          ) {

            await interaction.reply({
              content:
                "❌ Solo Owner, Administrator o Tierlist Manager pueden administrar testers.",
              ephemeral: true
            });

            return;
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

            await interaction.reply({
              content:
                `ℹ️ <@${user.id}> ya es Tester de **${MODES[mode].name}**.`,
              ephemeral: true
            });

            return;
          }

          db.testers[mode].push(
            user.id
          );

          saveDB();

          const roleName =
            `${MODES[mode].emoji} Tester • ${MODES[mode].name}`;

          let role =
            interaction.guild.roles.cache.find(
              r =>
                r.name ===
                roleName
            );

          if (!role) {

            role =
              await interaction.guild.roles.create({
                name:
                  roleName,
                color:
                  MODES[mode].color,
                hoist:
                  false,
                mentionable:
                  true,
                reason:
                  "Summer Tier List modality tester"
              });
          }

          const member =
            await interaction.guild.members.fetch(
              user.id
            ).catch(() => null);

          if (member && role) {
            await member.roles.add(
              role
            ).catch(() => {});
          }

          await logStaffAction(
            interaction.guild,
            "🧪 Tester Assigned",
            [
              `👤 **Usuario:** <@${user.id}>`,
              `🎮 **Modalidad:** ${MODES[mode].emoji} ${MODES[mode].name}`,
              `👮 **Staff:** <@${interaction.user.id}>`
            ].join("\n"),
            MODES[mode].color
          );

          await interaction.reply({
            content:
              `✅ <@${user.id}> ahora es Tester de **${MODES[mode].name}**.\n\nPuede registrar resultados de esta modalidad.`,
            ephemeral: true
          });

          return;
        }

        /* =========================
           REMOVE TESTER
        ========================= */

        if (
          command ===
          "removetester"
        ) {

          if (
            !hasRole(
              interaction.member,
              [
                "👑 Owner",
                "🛡️ Administrator",
                "💎 Tierlist Manager"
              ]
            )
          ) {

            await interaction.reply({
              content:
                "❌ No tienes permiso.",
              ephemeral: true
            });

            return;
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
              id =>
                id !== user.id
            );

          saveDB();

          const roleName =
            `${MODES[mode].emoji} Tester • ${MODES[mode].name}`;

          const role =
            interaction.guild.roles.cache.find(
              r =>
                r.name ===
                roleName
            );

          const member =
            await interaction.guild.members.fetch(
              user.id
            ).catch(() => null);

          if (
            member &&
            role &&
            member.roles.cache.has(
              role.id
            )
          ) {

            await member.roles.remove(
              role
            ).catch(() => {});
          }

          await interaction.reply({
            content:
              `✅ <@${user.id}> dejó de ser Tester de **${MODES[mode].name}**.`,
            ephemeral: true
          });

          return;
        }

        /* =========================
           RESULT / HIGH RESULT
        ========================= */

        if (
          command === "result" ||
          command === "highresult"
        ) {

          const mode =
            interaction.options.getString(
              "modalidad"
            );

          const high =
            command ===
            "highresult";

          if (high) {

            if (
              !canHighResult(
                interaction.member
              )
            ) {

              await interaction.reply({
                content:
                  "❌ Necesitas el rango **High Tester**, Tierlist Manager o superior.",
                ephemeral: true
              });

              return;
            }

          } else {

            if (
              !canResult(
                interaction.member,
                mode
              )
            ) {

              await interaction.reply({
                content:
                  `❌ No eres Tester autorizado para **${MODES[mode].name}**.`,
                ephemeral: true
              });

              return;
            }
          }

          const player =
            interaction.options.getUser(
              "jugador"
            );

          const tier =
            interaction.options.getString(
              "tier"
            );

          const minecraft =
            interaction.options.getString(
              "minecraft"
            );

          /*
           * IMPORTANTE:
           *
           * NO HAY CHECK DE COOLDOWN AQUÍ.
           *
           * El tester puede volver a poner /result
           * para corregir un resultado.
           */

          const previous =
            [
              ...db.results,
              ...db.highResults
            ]
              .filter(
                result =>
                  result.userId ===
                    player.id &&
                  result.mode ===
                    mode
              )
              .sort(
                (a, b) =>
                  b.createdAt -
                  a.createdAt
              )[0];

          const result = {
            userId:
              player.id,

            discord:
              player.tag,

            minecraft:
              minecraft,

            mode:
              mode,

            tier:
              tier,

            tester:
              interaction.user.tag,

            testerId:
              interaction.user.id,

            high:
              high,

            previousTier:
              previous
                ? previous.tier
                : null,

            createdAt:
              Date.now()
          };

          if (high) {

            db.highResults.push(
              result
            );

          } else {

            db.results.push(
              result
            );
          }

          /*
           * COOLDOWN:
           * Solo se aplica al jugador.
           * Nunca bloquea al tester.
           */

          setCooldown(
            player.id,
            mode
          );

          /*
           * SACAR DE WAITLIST
           */

          db.waitlists[mode] =
            db.waitlists[mode].filter(
              id =>
                id !==
                player.id
            );

          saveDB();

          /*
           * ASIGNAR TIER ROLE
           */

          const tierRoleName =
            `${MODES[mode].emoji} ${MODES[mode].name} ${tier}`;

          let tierRole =
            interaction.guild.roles.cache.find(
              role =>
                role.name ===
                tierRoleName
            );

          if (!tierRole) {

            tierRole =
              await interaction.guild.roles.create({
                name:
                  tierRoleName,
                color:
                  MODES[mode].color,
                hoist:
                  false,
                mentionable:
                  true,
                reason:
                  "Summer Tier List result tier"
              });
          }

          const playerMember =
            await interaction.guild.members.fetch(
              player.id
            ).catch(() => null);

          if (playerMember) {

            /*
             * Elimina tiers anteriores
             * SOLO de esta modalidad.
             */

            const oldTierRoles =
              playerMember.roles.cache.filter(
                role =>
                  role.name.startsWith(
                    `${MODES[mode].emoji} ${MODES[mode].name} `
                  ) &&
                  TIERS.includes(
                    role.name.split(" ").pop()
                  )
              );

            for (
              const role
              of oldTierRoles.values()
            ) {

              await playerMember.roles.remove(
                role
              ).catch(() => {});
            }

            /*
             * Añade nuevo tier.
             */

            await playerMember.roles.add(
              tierRole
            ).catch(() => {});
          }

          await updateAllWaitlistPanels(
            interaction.guild
          );

          /*
           * RESULT CHANNEL
           */

          const channelName =
            high
              ? "🏆・high-results"
              : "📊・results";

          const channel =
            interaction.guild.channels.cache.find(
              c =>
                c.name ===
                channelName
            );

          const skinUrl =
            `https://skinrender.dev/render/${encodeURIComponent(minecraft)}/avatar?size=256`;

          const embed =
            new EmbedBuilder()
              .setColor(
                high
                  ? 0xf1c40f
                  : MODES[mode].color
              )
              .setTitle(
                high
                  ? "🏆 HIGH TEST RESULT"
                  : "📊 OFFICIAL TEST RESULT"
              )
              .setDescription(
                [
                  `## ${MODES[mode].emoji} ${MODES[mode].name}`,
                  "",
                  "☀️ **SUMMER TIER LIST**",
                  "",
                  `👤 **PLAYER**`,
                  `<@${player.id}>`,
                  "",
                  `⛏️ **MINECRAFT**`,
                  `\`${minecraft}\``,
                  "",
                  `🏅 **TIER ACHIEVED**`,
                  `# ${tier}`,
                  "",
                  previous
                    ? `📈 **PREVIOUS TIER:** \`${previous.tier}\``
                    : "📈 **PREVIOUS TIER:** `Unranked`",
                  "",
                  `🧪 **TESTER**`,
                  `<@${interaction.user.id}>`,
                  "",
                  "━━━━━━━━━━━━━━━━━━━━",
                  "",
                  high
                    ? "🏆 **HIGH TEST COMPLETED**"
                    : "✅ **OFFICIAL TEST COMPLETED**",
                  "",
                  "━━━━━━━━━━━━━━━━━━━━",
                  "",
                  "☀️ Summer Tier List",
                  "Official Minecraft PvP Testing"
                ].join("\n")
              )
              .setThumbnail(
                skinUrl
              )
              .setFooter({
                text:
                  `${MODES[mode].name} • Summer Tier List`
              })
              .setTimestamp();

          if (channel) {

            await channel.send({
              embeds: [
                embed
              ]
            });
          }

          await logStaffAction(
            interaction.guild,
            high
              ? "🏆 High Test Result"
              : "📊 Test Result",
            [
              `👤 **Player:** <@${player.id}>`,
              `⛏️ **Minecraft:** \`${minecraft}\``,
              `🎮 **Mode:** ${MODES[mode].name}`,
              `🏅 **Tier:** ${tier}`,
              `🧪 **Tester:** <@${interaction.user.id}>`
            ].join("\n"),
            MODES[mode].color
          );

          await interaction.reply({
            content:
              [
                `✅ Resultado registrado: **${minecraft}**`,
                "",
                `${MODES[mode].emoji} **${MODES[mode].name}**`,
                `🏅 **${tier}**`,
                `🎖️ Rol asignado: **${tierRoleName}**`,
                "",
                "⏱️ Cooldown del jugador: **3 días**.",
                "🧪 El cooldown **no bloquea al tester**."
              ].join("\n"),
            ephemeral: true
          });

          return;
        }

        /* =========================
           REMOVE COOLDOWN
        ========================= */

        if (
          command ===
          "removecooldown"
        ) {

          if (
            !canRemoveCooldown(
              interaction.member
            )
          ) {

            await interaction.reply({
              content:
                "❌ Necesitas ser **Helper o superior** para eliminar cooldowns.",
              ephemeral: true
            });

            return;
          }

          const player =
            interaction.options.getUser(
              "jugador"
            );

          const mode =
            interaction.options.getString(
              "modalidad"
            );

          const cooldown =
            getCooldown(
              player.id,
              mode
            );

          if (
            !cooldown ||
            cooldown <= Date.now()
          ) {

            removeCooldown(
              player.id,
              mode
            );

            await interaction.reply({
              content:
                `ℹ️ <@${player.id}> no tenía un cooldown activo en **${MODES[mode].name}**.`,
              ephemeral: true
            });

            return;
          }

          removeCooldown(
            player.id,
            mode
          );

          await logStaffAction(
            interaction.guild,
            "🔓 Cooldown Removed",
            [
              `👤 **Jugador:** <@${player.id}>`,
              `🎮 **Modalidad:** ${MODES[mode].name}`,
              `👮 **Staff:** <@${interaction.user.id}>`
            ].join("\n"),
            0x2ecc71
          );

          await interaction.reply({
            content:
              `✅ Cooldown eliminado para <@${player.id}> en **${MODES[mode].name}**.`,
            ephemeral: true
          });

          return;
        }

        /* =========================
           RESULTS
        ========================= */

        if (
          command ===
          "results"
        ) {

          const recent =
            db.results
              .slice(-10)
              .reverse();

          if (!recent.length) {

            await interaction.reply({
              content:
                "📭 Todavía no hay resultados.",
              ephemeral: true
            });

            return;
          }

          const description =
            recent
              .map(
                (result, index) =>
                  [
                    `**${index + 1}.** ${MODES[result.mode]?.emoji || "🎮"} **${result.minecraft}**`,
                    `└ ${MODES[result.mode]?.name || result.mode} • **${result.tier}** • <@${result.userId}>`
                  ].join("\n")
              )
              .join("\n\n");

          const embed =
            new EmbedBuilder()
              .setColor(0x5865f2)
              .setTitle(
                "📊 SUMMER TIER LIST • RESULTS"
              )
              .setDescription(
                description
              )
              .setFooter({
                text:
                  "Summer Tier List • Recent Results"
              })
              .setTimestamp();

          await interaction.reply({
            embeds: [
              embed
            ]
          });

          return;
        }

        /* =========================
           QUEUE
        ========================= */

        if (
          command ===
          "queue"
        ) {

          const mode =
            interaction.options.getString(
              "modalidad"
            );

          const queue =
            db.waitlists[mode] ||
            [];

          const active =
            db.waitlistStatus[mode];

          const description =
            queue.length
              ? queue
                  .map(
                    (id, index) =>
                      `**${index + 1}.** <@${id}>`
                  )
                  .join("\n")
              : "📭 La waitlist está vacía.";

          const embed =
            new EmbedBuilder()
              .setColor(
                active
                  ? MODES[mode].color
                  : 0xe74c3c
              )
              .setTitle(
                `${MODES[mode].emoji} ${MODES[mode].name} • QUEUE`
              )
              .setDescription(
                [
                  `**Estado:** ${
                    active
                      ? "🟢 OPEN"
                      : "🔴 CLOSED"
                  }`,
                  `**Jugadores:** ${queue.length}`,
                  "",
                  description
                ].join("\n")
              )
              .setFooter({
                text:
                  "Summer Tier List • Queue"
              });

          await interaction.reply({
            embeds: [
              embed
            ],
            ephemeral: true
          });

          return;
        }

        /* =========================
           PROFILE
        ========================= */

        if (
          command ===
          "profile"
        ) {

          const user =
            interaction.options.getUser(
              "jugador"
            ) ||
            interaction.user;

          const results =
            [
              ...db.results,
              ...db.highResults
            ]
              .filter(
                result =>
                  result.userId ===
                  user.id
              )
              .sort(
                (a, b) =>
                  a.createdAt -
                  b.createdAt
              );

          const modeLines =
            MODE_KEYS
              .map(
                mode => {

                  const modeResults =
                    results.filter(
                      result =>
                        result.mode ===
                        mode
                    );

                  const latest =
                    modeResults.at(-1);

                  return [
                    `${MODES[mode].emoji} **${MODES[mode].name}**`,
                    latest
                      ? `\`${latest.tier}\``
                      : "`Unranked`"
                  ].join(" ");
                }
              )
              .join("\n");

          const cooldownLines =
            MODE_KEYS
              .map(
                mode => {

                  const cooldown =
                    getCooldown(
                      user.id,
                      mode
                    );

                  if (
                    cooldown >
                    Date.now()
                  ) {

                    return `${MODES[mode].emoji} ${MODES[mode].name}: **${formatRemaining(cooldown - Date.now())}**`;
                  }

                  return null;
                }
              )
              .filter(Boolean)
              .join("\n");

          const embed =
            new EmbedBuilder()
              .setColor(0xf1c40f)
              .setAuthor({
                name:
                  user.tag,
                iconURL:
                  user.displayAvatarURL()
              })
              .setTitle(
                "☀️ PLAYER PROFILE"
              )
              .setDescription(
                [
                  `👤 **Discord:** <@${user.id}>`,
                  "",
                  "### 🏅 RANKINGS",
                  modeLines,
                  "",
                  "### 📈 STATISTICS",
                  `• Tests: **${results.length}**`,
                  "",
                  "### ⏱️ COOLDOWNS",
                  cooldownLines ||
                    "✅ No active cooldowns."
                ].join("\n")
              )
              .setFooter({
                text:
                  "Summer Tier List • Official Profile"
              })
              .setTimestamp();

          await interaction.reply({
            embeds: [
              embed
            ]
          });

          return;
        }

        /* =========================
           SUPPORT
        ========================= */

        if (
          command ===
          "support"
        ) {

          const channel =
            interaction.guild.channels.cache.find(
              c =>
                c.name ===
                "🎫・ticket-panel"
            );

          await interaction.reply({
            content:
              channel
                ? `🎫 Abre tu ticket aquí: ${channel}`
                : "❌ El sistema de tickets no está configurado.",
            ephemeral: true
          });

          return;
        }

        /* =========================
           STAFF SETUP
        ========================= */

        if (
          command ===
          "staffsetup"
        ) {

          await interaction.deferReply({
            ephemeral: true
          });

          await createStaffRoles(
            interaction.guild
          );

          await interaction.editReply(
            [
              "🛡️ **STAFF SYSTEM**",
              "",
              "Los rangos oficiales fueron configurados.",
              "",
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
            ].join("\n")
          );

          return;
        }

        /* =========================
           RESET
        ========================= */

        if (
          command ===
          "reset"
        ) {

          await interaction.deferReply({
            ephemeral: true
          });

          const guild =
            interaction.guild;

          const categories = [
            "☀️ SUMMER TIER LIST",
            "📌 INFORMATION",
            "🔔 ROLES",
            "🎬 MEDIA",
            "🛡️ STAFF",
            "🎫 TICKETS"
          ];

          let deleted = 0;

          for (
            const name
            of categories
          ) {

            const category =
              guild.channels.cache.find(
                c =>
                  c.type ===
                    ChannelType.GuildCategory &&
                  c.name ===
                    name
              );

            if (!category) {
              continue;
            }

            const children =
              guild.channels.cache.filter(
                c =>
                  c.parentId ===
                  category.id
              );

            for (
              const channel
              of children.values()
            ) {

              await channel.delete(
                "Summer Tier List reset"
              ).catch(() => {});

              deleted++;
            }

            await category.delete(
              "Summer Tier List reset"
            ).catch(() => {});
          }

          db =
            defaultDatabase();

          saveDB();

          await interaction.editReply(
            [
              "🧹 **SUMMER TIER LIST RESET**",
              "",
              `🗑️ Canales eliminados: **${deleted}**`,
              "💾 Base de datos reiniciada.",
              "",
              "Ejecuta **/setup** para reconstruir todo."
            ].join("\n")
          );

          return;
        }
      }

      /* ===================================================
         ROLE SELECT MENUS
      =================================================== */

      if (
        interaction.isStringSelectMenu() &&
        interaction.customId.startsWith(
          "roles:"
        )
      ) {

        const type =
          interaction.customId.split(":")[1];

        const member =
          interaction.member;

        /* =========================
           REGION
        ========================= */

        if (
          type ===
          "region"
        ) {

          for (
            const roleData
            of REGION_ROLES
          ) {

            const role =
              interaction.guild.roles.cache.find(
                r =>
                  r.name ===
                  roleData.name
              );

            if (
              role &&
              member.roles.cache.has(
                role.id
              )
            ) {

              await member.roles.remove(
                role
              ).catch(() => {});
            }
          }

          const selectedName =
            interaction.values[0];

          const selectedRole =
            interaction.guild.roles.cache.find(
              r =>
                r.name ===
                selectedName
            );

          if (selectedRole) {

            await member.roles.add(
              selectedRole
            ).catch(() => {});
          }

          await interaction.reply({
            content:
              `🌎 Región seleccionada: **${selectedName}**`,
            ephemeral: true
          });

          return;
        }

        /* =========================
           PINGS
        ========================= */

        if (
          type ===
          "pings"
        ) {

          for (
            const roleData
            of PING_ROLES
          ) {

            const role =
              interaction.guild.roles.cache.find(
                r =>
                  r.name ===
                  roleData.name
              );

            if (!role) {
              continue;
            }

            const selected =
              interaction.values.includes(
                role.name
              );

            if (selected) {

              if (
                !member.roles.cache.has(
                  role.id
                )
              ) {

                await member.roles.add(
                  role
                ).catch(() => {});
              }

            } else {

              if (
                member.roles.cache.has(
                  role.id
                )
              ) {

                await member.roles.remove(
                  role
                ).catch(() => {});
              }
            }
          }

          await interaction.reply({
            content:
              interaction.values.length
                ? `🔔 Pings actualizados: **${interaction.values.length}** seleccionados.`
                : "🔕 Has desactivado todos los pings.",
            ephemeral: true
          });

          return;
        }

        /* =========================
           MODALITIES
        ========================= */

        if (
          type ===
          "modalities"
        ) {

          for (
            const mode
            of MODE_KEYS
          ) {

            const roleName =
              `${MODES[mode].emoji} ${MODES[mode].name}`;

            const role =
              interaction.guild.roles.cache.find(
                r =>
                  r.name ===
                  roleName
              );

            if (!role) {
              continue;
            }

            const selected =
              interaction.values.includes(
                mode
              );

            if (selected) {

              if (
                !member.roles.cache.has(
                  role.id
                )
              ) {

                await member.roles.add(
                  role
                ).catch(() => {});
              }

            } else {

              if (
                member.roles.cache.has(
                  role.id
                )
              ) {

                await member.roles.remove(
                  role
                ).catch(() => {});
              }
            }
          }

          await interaction.reply({
            content:
              interaction.values.length
                ? `🎮 Modalidades seleccionadas: **${interaction.values.length}**.`
                : "🎮 No seleccionaste ninguna modalidad.",
            ephemeral: true
          });

          return;
        }
      }

      /* ===================================================
         WAITLIST BUTTONS
      =================================================== */

      if (
        interaction.isButton() &&
        interaction.customId.startsWith(
          "waitlist:"
        )
      ) {

        const parts =
          interaction.customId.split(":");

        const action =
          parts[1];

        const mode =
          parts[2];

        if (
          !MODE_KEYS.includes(
            mode
          )
        ) {
          return;
        }

        /* =========================
           JOIN
        ========================= */

        if (
          action ===
          "join"
        ) {

          if (
            !db.waitlistStatus[mode]
          ) {

            await interaction.reply({
              content:
                `🔴 La waitlist de **${MODES[mode].name}** está cerrada.`,
              ephemeral: true
            });

            return;
          }

          /*
           * AQUÍ SÍ se comprueba cooldown.
           */

          const cooldown =
            getCooldown(
              interaction.user.id,
              mode
            );

          if (
            cooldown >
            Date.now()
          ) {

            await interaction.reply({
              content:
                [
                  `⏳ Tienes cooldown en **${MODES[mode].name}**.`,
                  "",
                  `Tiempo restante: **${formatRemaining(cooldown - Date.now())}**`,
                  "",
                  "Si necesitas una excepción, contacta a un Helper o superior."
                ].join("\n"),
              ephemeral: true
            });

            return;
          }

          if (
            db.waitlists[mode].includes(
              interaction.user.id
            )
          ) {

            await interaction.reply({
              content:
                "❌ Ya estás en esta waitlist.",
              ephemeral: true
            });

            return;
          }

          db.waitlists[mode].push(
            interaction.user.id
          );

          saveDB();

          await updateAllWaitlistPanels(
            interaction.guild
          );

          await interaction.reply({
            content:
              [
                `✅ Entraste a **${MODES[mode].name} Waitlist**.`,
                "",
                `📍 Posición: **${db.waitlists[mode].length}**`,
                "",
                "🧪 Un tester autorizado podrá gestionar tu test."
              ].join("\n"),
            ephemeral: true
          });

          return;
        }

        /* =========================
           LEAVE
        ========================= */

        if (
          action ===
          "leave"
        ) {

          const wasInside =
            db.waitlists[mode].includes(
              interaction.user.id
            );

          db.waitlists[mode] =
            db.waitlists[mode].filter(
              id =>
                id !==
                interaction.user.id
            );

          saveDB();

          await updateAllWaitlistPanels(
            interaction.guild
          );

          await interaction.reply({
            content:
              wasInside
                ? `✅ Saliste de **${MODES[mode].name} Waitlist**.`
                : "ℹ️ No estabas en esta waitlist.",
            ephemeral: true
          });

          return;
        }

        /* =========================
           VIEW
        ========================= */

        if (
          action ===
          "view"
        ) {

          const queue =
            db.waitlists[mode];

          if (!queue.length) {

            await interaction.reply({
              content:
                `📭 **${MODES[mode].name}** está vacía.`,
              ephemeral: true
            });

            return;
          }

          const list =
            queue
              .map(
                (id, index) =>
                  `**${index + 1}.** <@${id}>`
              )
              .join("\n");

          const embed =
            new EmbedBuilder()
              .setColor(
                MODES[mode].color
              )
              .setTitle(
                `${MODES[mode].emoji} ${MODES[mode].name} • WAITLIST`
              )
              .setDescription(
                list
              )
              .setFooter({
                text:
                  `Players waiting: ${queue.length}`
              });

          await interaction.reply({
            embeds: [
              embed
            ],
            ephemeral: true
          });

          return;
        }
      }

      /* ===================================================
         OPEN TICKET
      =================================================== */

      if (
        interaction.isButton() &&
        interaction.customId ===
          "ticket:open"
      ) {

        const menu =
          new StringSelectMenuBuilder()
            .setCustomId(
              "ticket:type"
            )
            .setPlaceholder(
              "Selecciona el tipo de ticket"
            )
            .addOptions(

              new StringSelectMenuOptionBuilder()
                .setLabel(
                  "Support"
                )
                .setDescription(
                  "Ayuda general"
                )
                .setEmoji("🛡️")
                .setValue(
                  "support"
                ),

              new StringSelectMenuOptionBuilder()
                .setLabel(
                  "Tester Application"
                )
                .setDescription(
                  "Aplicar para Tester"
                )
                .setEmoji("🧪")
                .setValue(
                  "tester"
                ),

              new StringSelectMenuOptionBuilder()
                .setLabel(
                  "Staff Application"
                )
                .setDescription(
                  "Aplicar para Staff"
                )
                .setEmoji("👑")
                .setValue(
                  "staff"
                ),

              new StringSelectMenuOptionBuilder()
                .setLabel(
                  "High Test"
                )
                .setDescription(
                  "Solicitar High Test"
                )
                .setEmoji("🔥")
                .setValue(
                  "high"
                )
            );

        await interaction.reply({
          content:
            "🎫 **SUMMER TIER LIST**\n\nSelecciona qué necesitas:",
          components: [
            new ActionRowBuilder()
              .addComponents(
                menu
              )
          ],
          ephemeral: true
        });

        return;
      }

      /* ===================================================
         TICKET TYPE
      =================================================== */

      if (
        interaction.isStringSelectMenu() &&
        interaction.customId ===
          "ticket:type"
      ) {

        const type =
          interaction.values[0];

        const guild =
          interaction.guild;

        const category =
          await getOrCreateCategory(
            guild,
            "🎫 TICKETS"
          );

        const existing =
          guild.channels.cache.find(
            c =>
              c.parentId ===
                category.id &&
              c.topic ===
                `ticket-owner:${interaction.user.id}`
          );

        if (existing) {

          await interaction.reply({
            content:
              `❌ Ya tienes un ticket abierto: ${existing}`,
            ephemeral: true
          });

          return;
        }

        const names = {
          support:
            "support",
          tester:
            "tester-application",
          staff:
            "staff-application",
          high:
            "high-test"
        };

        const channelName =
          `${names[type]}-${cleanUsername(interaction.user.username)}`
            .slice(
              0,
              95
            );

        const overwrites = [
          {
            id:
              guild.roles.everyone.id,
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
        ];

        const staffRoleNames = [
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
          "🧑‍💻 Developer"
        ];

        for (
          const roleName
          of staffRoleNames
        ) {

          const role =
            guild.roles.cache.find(
              r =>
                r.name ===
                roleName
            );

          if (!role) {
            continue;
          }

          overwrites.push({
            id:
              role.id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory
            ]
          });
        }

        const channel =
          await guild.channels.create({
            name:
              channelName,
            type:
              ChannelType.GuildText,
            parent:
              category.id,
            topic:
              `ticket-owner:${interaction.user.id}`,
            permissionOverwrites:
              overwrites
          });

        let title =
          "🎫 Summer Tier List";

        let description =
          "Describe tu problema y un miembro del staff te ayudará.";

        if (
          type ===
          "tester"
        ) {

          title =
            "🧪 Tester Application";

          description =
            "Completa la aplicación para solicitar entrar al equipo de testers.";
        }

        if (
          type ===
          "staff"
        ) {

          title =
            "👑 Staff Application";

          description =
            "Completa la aplicación para solicitar entrar al staff.";
        }

        if (
          type ===
          "high"
        ) {

          title =
            "🔥 High Test";

          description =
            "Explica tu solicitud de High Test. Recuerda que los High Tests se solicitan mediante soporte.";
        }

        const embed =
          new EmbedBuilder()
            .setColor(0x5865f2)
            .setTitle(
              title
            )
            .setDescription(
              [
                description,
                "",
                "━━━━━━━━━━━━━━━━━━━━",
                "",
                `👤 **Usuario:** <@${interaction.user.id}>`,
                "",
                "🔒 Este ticket es privado.",
                "",
                "Un miembro del staff te atenderá."
              ].join("\n")
            )
            .setFooter({
              text:
                "Summer Tier List • Support"
            })
            .setTimestamp();

        const closeButton =
          new ButtonBuilder()
            .setCustomId(
              "ticket:close"
            )
            .setLabel(
              "Close Ticket"
            )
            .setEmoji("🔒")
            .setStyle(
              ButtonStyle.Danger
            );

        const components = [
          new ActionRowBuilder()
            .addComponents(
              closeButton
            )
        ];

        if (
          type === "tester" ||
          type === "staff"
        ) {

          const applyButton =
            new ButtonBuilder()
              .setCustomId(
                `ticket:application:${type}`
              )
              .setLabel(
                "Complete Application"
              )
              .setEmoji(
                type === "tester"
                  ? "🧪"
                  : "👑"
              )
              .setStyle(
                ButtonStyle.Primary
              );

          components.unshift(
            new ActionRowBuilder()
              .addComponents(
                applyButton
              )
          );
        }

        await channel.send({
          content:
            `<@${interaction.user.id}>`,
          embeds: [
            embed
          ],
          components
        });

        db.tickets.push({
          channelId:
            channel.id,
          userId:
            interaction.user.id,
          type,
          createdAt:
            Date.now(),
          closed:
            false
        });

        saveDB();

        await interaction.reply({
          content:
            `✅ Ticket creado: ${channel}`,
          ephemeral: true
        });

        return;
      }

      /* ===================================================
         APPLICATION BUTTON
      =================================================== */

      if (
        interaction.isButton() &&
        interaction.customId.startsWith(
          "ticket:application:"
        )
      ) {

        const type =
          interaction.customId.split(":")[2];

        const modal =
          new ModalBuilder()
            .setCustomId(
              `application:${type}`
            )
            .setTitle(
              type === "tester"
                ? "🧪 Tester Application"
                : "👑 Staff Application"
            );

        const minecraft =
          new TextInputBuilder()
            .setCustomId(
              "minecraft"
            )
            .setLabel(
              "Minecraft Username"
            )
            .setPlaceholder(
              "Tu nombre de Minecraft"
            )
            .setStyle(
              TextInputStyle.Short
            )
            .setRequired(
              true
            )
            .setMaxLength(
              50
            );

        const experience =
          new TextInputBuilder()
            .setCustomId(
              "experience"
            )
            .setLabel(
              "Experiencia"
            )
            .setPlaceholder(
              "Cuéntanos sobre tu experiencia"
            )
            .setStyle(
              TextInputStyle.Paragraph
            )
            .setRequired(
              true
            )
            .setMaxLength(
              1000
            );

        const reason =
          new TextInputBuilder()
            .setCustomId(
              "reason"
            )
            .setLabel(
              "¿Por qué quieres entrar?"
            )
            .setPlaceholder(
              "Explica tu motivo"
            )
            .setStyle(
              TextInputStyle.Paragraph
            )
            .setRequired(
              true
            )
            .setMaxLength(
              1000
            );

        modal.addComponents(

          new ActionRowBuilder()
            .addComponents(
              minecraft
            ),

          new ActionRowBuilder()
            .addComponents(
              experience
            ),

          new ActionRowBuilder()
            .addComponents(
              reason
            )
        );

        await interaction.showModal(
          modal
        );

        return;
      }

      /* ===================================================
         APPLICATION SUBMIT
      =================================================== */

      if (
        interaction.isModalSubmit() &&
        interaction.customId.startsWith(
          "application:"
        )
      ) {

        const type =
          interaction.customId.split(":")[1];

        const minecraft =
          interaction.fields.getTextInputValue(
            "minecraft"
          );

        const experience =
          interaction.fields.getTextInputValue(
            "experience"
          );

        const reason =
          interaction.fields.getTextInputValue(
            "reason"
          );

        db.applications.push({
          userId:
            interaction.user.id,
          type,
          minecraft,
          experience,
          reason,
          createdAt:
            Date.now()
        });

        saveDB();

        const embed =
          new EmbedBuilder()
            .setColor(0x2ecc71)
            .setTitle(
              type === "tester"
                ? "🧪 TESTER APPLICATION"
                : "👑 STAFF APPLICATION"
            )
            .setDescription(
              [
                `👤 **Applicant:** <@${interaction.user.id}>`,
                "",
                `⛏️ **Minecraft:** ${minecraft}`,
                "",
                `📖 **Experiencia:**`,
                experience,
                "",
                `💬 **Motivo:**`,
                reason
              ].join("\n")
            )
            .setFooter({
              text:
                "Summer Tier List • Application"
            })
            .setTimestamp();

        await interaction.channel.send({
          embeds: [
            embed
          ]
        });

        await interaction.reply({
          content:
            "✅ **Aplicación enviada correctamente.**",
          ephemeral: true
        });

        return;
      }

      /* ===================================================
         CLOSE TICKET
      =================================================== */

      if (
        interaction.isButton() &&
        interaction.customId ===
          "ticket:close"
      ) {

        const ticket =
          db.tickets.find(
            t =>
              t.channelId ===
              interaction.channel.id
          );

        if (
          ticket &&
          !isStaff(
            interaction.member
          ) &&
          ticket.userId !==
            interaction.user.id
        ) {

          await interaction.reply({
            content:
              "❌ No puedes cerrar este ticket.",
            ephemeral: true
          });

          return;
        }

        if (ticket) {

          ticket.closed =
            true;

          ticket.closedAt =
            Date.now();

          saveDB();
        }

        await interaction.reply({
          content:
            [
              "🔒 **Ticket cerrado.**",
              "",
              "⏱️ Cerrar un ticket **NO genera cooldown**."
            ].join("\n")
        });

        setTimeout(
          async () => {

            await interaction.channel.delete(
              "Summer Tier List ticket closed"
            ).catch(() => {});

          },
          5000
        );

        return;
      }

    } catch (error) {

      console.error(
        "❌ Error procesando interacción:"
      );

      console.error(
        error
      );

      try {

        if (
          !interaction.replied &&
          !interaction.deferred
        ) {

          await interaction.reply({
            content:
              "❌ Ocurrió un error procesando esta acción.",
            ephemeral: true
          });

        } else if (
          interaction.deferred &&
          !interaction.replied
        ) {

          await interaction.editReply({
            content:
              "❌ Ocurrió un error procesando esta acción."
          });
        }

      } catch {}
    }
  }
);

/* =========================================================
   READY
========================================================= */

client.once(
  Events.ClientReady,
  async () => {

    console.log("");
    console.log(
      "=========================================="
    );
    console.log(
      "☀️ SUMMER TIER LIST"
    );
    console.log(
      `🤖 ${client.user.tag}`
    );
    console.log(
      "🟢 BOT ONLINE"
    );
    console.log(
      "=========================================="
    );
    console.log("");

    await registerCommands();

    try {

      const guild =
        await client.guilds.fetch(
          GUILD_ID
        );

      await guild.channels.fetch();
      await guild.roles.fetch();

      await setupServer(
        guild
      );

      console.log(
        "✅ Estructura automática comprobada."
      );

    } catch (error) {

      console.error(
        "❌ No se pudo comprobar la estructura:",
        error
      );
    }
  }
);

/* =========================================================
   LOGIN
========================================================= */

client.login(
  TOKEN
);
```
