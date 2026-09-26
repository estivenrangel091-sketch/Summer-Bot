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
   CONFIGURACIÓN
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

const DB_FILE = path.join(__dirname, "database.json");

/* =========================================================
   MODALIDADES
========================================================= */

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

const COOLDOWN_TIME =
  3 * 24 * 60 * 60 * 1000;

/* =========================================================
   BASE DE DATOS
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

    applications: []
  };
}

function loadDB() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      const db = defaultDatabase();

      fs.writeFileSync(
        DB_FILE,
        JSON.stringify(db, null, 2),
        "utf8"
      );

      return db;
    }

    const raw =
      fs.readFileSync(
        DB_FILE,
        "utf8"
      );

    const db =
      raw.trim()
        ? JSON.parse(raw)
        : defaultDatabase();

    const defaults =
      defaultDatabase();

    for (const key of Object.keys(defaults)) {
      if (db[key] === undefined) {
        db[key] = defaults[key];
      }
    }

    for (const mode of MODE_KEYS) {
      db.waitlists[mode] ??= [];
      db.waitlistStatus[mode] ??= true;
    }

    return db;

  } catch (error) {
    console.error(
      "❌ Error leyendo database.json:",
      error
    );

    return defaultDatabase();
  }
}

function saveDB(db) {
  fs.writeFileSync(
    DB_FILE,
    JSON.stringify(db, null, 2),
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

function getCooldownKey(userId, mode) {
  return `${userId}:${mode}`;
}

function getCooldown(userId, mode) {
  return db.cooldowns[
    getCooldownKey(userId, mode)
  ] || 0;
}

function setCooldown(userId, mode) {
  db.cooldowns[
    getCooldownKey(userId, mode)
  ] = Date.now() + COOLDOWN_TIME;

  saveDB(db);
}

function formatRemaining(ms) {
  if (ms <= 0) return "0 minutos";

  const days = Math.floor(
    ms / 86400000
  );

  const hours = Math.floor(
    (ms % 86400000) / 3600000
  );

  const minutes = Math.floor(
    (ms % 3600000) / 60000
  );

  const parts = [];

  if (days) {
    parts.push(`${days}d`);
  }

  if (hours) {
    parts.push(`${hours}h`);
  }

  if (minutes) {
    parts.push(`${minutes}m`);
  }

  return parts.join(" ");
}

function cleanUsername(username) {
  const cleaned =
    username
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "");

  return cleaned || "user";
}

function isStaff(member) {
  if (!member) return false;

  if (
    member.permissions.has(
      PermissionFlagsBits.Administrator
    )
  ) {
    return true;
  }

  const staffRoles = [
    "👑 Owner",
    "🛡️ Administrator",
    "🔨 Moderator",
    "💎 Tierlist Manager",
    "🏆 High Tester",
    "🧪 Senior Tester",
    "⚔️ Tester",
    "📋 Trial Tester",
    "🎫 Support",
    "🧑‍💻 Developer"
  ];

  return member.roles.cache.some(
    role =>
      staffRoles.includes(role.name)
  );
}

function canManageWaitlist(member) {
  if (!member) return false;

  if (
    member.permissions.has(
      PermissionFlagsBits.Administrator
    )
  ) {
    return true;
  }

  const roles = [
    "👑 Owner",
    "🛡️ Administrator",
    "🔨 Moderator",
    "💎 Tierlist Manager",
    "🏆 High Tester",
    "🧪 Senior Tester",
    "⚔️ Tester"
  ];

  return member.roles.cache.some(
    role => roles.includes(role.name)
  );
}

/* =========================================================
   CLIENT
========================================================= */

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds
  ]
});

/* =========================================================
   COMANDOS
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
      "Crea toda la estructura de Summer Tier List."
    )
    .setDefaultMemberPermissions(
      PermissionFlagsBits.Administrator
    ),

  new SlashCommandBuilder()
    .setName("setupwaitlist")
    .setDescription(
      "Repara y publica los paneles de waitlist."
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
          ...MODE_KEYS.map(mode => ({
            name:
              `${MODES[mode].emoji} ${MODES[mode].name}`,
            value: mode
          }))
        )
    )
    .addStringOption(option =>
      option
        .setName("estado")
        .setDescription(
          "Estado de la waitlist"
        )
        .setRequired(true)
        .addChoices(
          {
            name: "🟢 Encender",
            value: "on"
          },
          {
            name: "🔴 Apagar",
            value: "off"
          }
        )
    )
    .setDefaultMemberPermissions(
      PermissionFlagsBits.Administrator
    ),

  new SlashCommandBuilder()
    .setName("reset")
    .setDescription(
      "Elimina toda la estructura de Summer Tier List."
    )
    .setDefaultMemberPermissions(
      PermissionFlagsBits.Administrator
    ),

  new SlashCommandBuilder()
    .setName("staffsetup")
    .setDescription(
      "Crea los rangos oficiales de staff."
    )
    .setDefaultMemberPermissions(
      PermissionFlagsBits.Administrator
    ),

  new SlashCommandBuilder()
    .setName("result")
    .setDescription(
      "Registra un resultado de test."
    )
    .addUserOption(option =>
      option
        .setName("jugador")
        .setDescription(
          "Jugador evaluado"
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
          ...MODE_KEYS.map(mode => ({
            name:
              `${MODES[mode].emoji} ${MODES[mode].name}`,
            value: mode
          }))
        )
    )
    .addStringOption(option =>
      option
        .setName("tier")
        .setDescription(
          "Tier obtenido"
        )
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
        .setDescription(
          "Nombre de Minecraft"
        )
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("highresult")
    .setDescription(
      "Registra un resultado de High Test."
    )
    .addUserOption(option =>
      option
        .setName("jugador")
        .setDescription(
          "Jugador evaluado"
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
          ...MODE_KEYS.map(mode => ({
            name:
              `${MODES[mode].emoji} ${MODES[mode].name}`,
            value: mode
          }))
        )
    )
    .addStringOption(option =>
      option
        .setName("tier")
        .setDescription(
          "Tier obtenido"
        )
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
        .setDescription(
          "Nombre de Minecraft"
        )
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("results")
    .setDescription(
      "Muestra los resultados recientes."
    ),

  new SlashCommandBuilder()
    .setName("queue")
    .setDescription(
      "Muestra la cola de una modalidad."
    )
    .addStringOption(option =>
      option
        .setName("modalidad")
        .setDescription(
          "Modalidad"
        )
        .setRequired(true)
        .addChoices(
          ...MODE_KEYS.map(mode => ({
            name:
              `${MODES[mode].emoji} ${MODES[mode].name}`,
            value: mode
          }))
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
      "Muestra información del sistema de soporte."
    )

].map(command => command.toJSON());

/* =========================================================
   REGISTRO AUTOMÁTICO
========================================================= */

async function registerCommands() {
  try {

    console.log(
      "🔄 Registrando comandos..."
    );

    const rest =
      new REST({
        version: "10"
      }).setToken(TOKEN);

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
      `✅ ${commands.length} comandos registrados correctamente.`
    );

  } catch (error) {

    console.error(
      "❌ Error registrando comandos:"
    );

    console.error(error);
  }
}

/* =========================================================
   CREAR ROLES
========================================================= */

const STAFF_ROLES = [
  {
    name: "👑 Owner",
    color: 0xF1C40F,
    hoist: true
  },
  {
    name: "🛡️ Administrator",
    color: 0xE74C3C,
    hoist: true
  },
  {
    name: "🔨 Moderator",
    color: 0xE67E22,
    hoist: true
  },
  {
    name: "💎 Tierlist Manager",
    color: 0x00BFFF,
    hoist: true
  },
  {
    name: "🏆 High Tester",
    color: 0xFF0000,
    hoist: true
  },
  {
    name: "🧪 Senior Tester",
    color: 0x9B59B6,
    hoist: true
  },
  {
    name: "⚔️ Tester",
    color: 0x3498DB,
    hoist: true
  },
  {
    name: "📋 Trial Tester",
    color: 0x1ABC9C,
    hoist: true
  },
  {
    name: "🎫 Support",
    color: 0x2ECC71,
    hoist: true
  },
  {
    name: "🧑‍💻 Developer",
    color: 0x34495E,
    hoist: true
  },
  {
    name: "🤝 Partner",
    color: 0xF39C12,
    hoist: false
  },
  {
    name: "📝 Staff Applicant",
    color: 0x95A5A6,
    hoist: false
  }
];

async function createStaffRoles(guild) {

  for (const roleData of STAFF_ROLES) {

    const existing =
      guild.roles.cache.find(
        role =>
          role.name === roleData.name
      );

    if (existing) continue;

    try {

      await guild.roles.create({
        name: roleData.name,
        color: roleData.color,
        hoist: roleData.hoist,
        mentionable: true,
        reason:
          "Summer Tier List staff setup"
      });

    } catch (error) {

      console.error(
        `❌ No se pudo crear ${roleData.name}:`,
        error
      );
    }
  }
}

/* =========================================================
   CREAR CATEGORÍA
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
        channel.name === name
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
   CREAR WAITLIST
========================================================= */

async function createWaitlistChannel(
  guild,
  category,
  mode
) {

  const info = modeInfo(mode);

  const channelName =
    `${info.emoji}・${mode}-waitlist`;

  let channel =
    guild.channels.cache.find(
      c =>
        c.type === ChannelType.GuildText &&
        (
          c.name === channelName ||
          c.name === `${mode}-waitlist`
        )
    );

  if (!channel) {

    channel =
      await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        parent: category.id
      });

  } else {

    if (channel.name !== channelName) {

      await channel.setName(
        channelName
      );
    }

    if (
      channel.parentId !== category.id
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
   PANEL WAITLIST
========================================================= */

async function ensureWaitlistPanel(
  channel,
  mode
) {

  const info = modeInfo(mode);

  let messages;

  try {

    messages =
      await channel.messages.fetch({
        limit: 50
      });

  } catch {
    return;
  }

  const existing =
    messages.find(
      message =>
        message.author.id ===
          client.user.id &&
        message.embeds.length > 0 &&
        message.embeds[0].footer?.text ===
          `Summer Tier List • ${mode}`
    );

  if (existing) {

    await updateWaitlistPanel(
      channel,
      mode,
      existing
    );

    return;
  }

  const embed =
    buildWaitlistEmbed(mode);

  const row =
    buildWaitlistButtons(mode);

  await channel.send({
    embeds: [embed],
    components: [row]
  });
}

function buildWaitlistEmbed(mode) {

  const info = modeInfo(mode);

  const queue =
    db.waitlists[mode] || [];

  const active =
    db.waitlistStatus[mode];

  return new EmbedBuilder()
    .setColor(
      active
        ? 0x2ECC71
        : 0xE74C3C
    )
    .setTitle(
      `${info.emoji}  ${info.name.toUpperCase()}`
    )
    .setDescription(
      [
        "## ☀️ SUMMER TIER LIST",
        "",
        `### ${info.emoji} ${info.name} Testing`,
        "",
        "Participa en la lista oficial para solicitar",
        "un test de Minecraft PvP.",
        "",
        "━━━━━━━━━━━━━━━━━━━━",
        "",
        `**Estado:** ${
          active
            ? "🟢 OPEN"
            : "🔴 CLOSED"
        }`,
        `**Jugadores en cola:** \`${queue.length}\``,
        "",
        active
          ? "Presiona **Join Waitlist** para entrar."
          : "La waitlist está temporalmente cerrada.",
        "",
        "━━━━━━━━━━━━━━━━━━━━",
        "",
        "⏱️ **Cooldown:** 3 días después de un resultado.",
        "🎫 Los tickets son abiertos manualmente por staff.",
        "",
        "### 📌 Reglas",
        "• No abandones la cola después de ser llamado.",
        "• No hagas spam de botones.",
        "• Respeta a los testers y demás jugadores."
      ].join("\n")
    )
    .setFooter({
      text:
        `Summer Tier List • ${mode}`
    })
    .setTimestamp();
}

function buildWaitlistButtons(mode) {

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
        .setDisabled(!active),

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

async function updateWaitlistPanel(
  channel,
  mode,
  message
) {

  try {

    await message.edit({
      embeds: [
        buildWaitlistEmbed(mode)
      ],
      components: [
        buildWaitlistButtons(mode)
      ]
    });

  } catch {}
}

async function updateAllWaitlistPanels(
  guild
) {

  const category =
    guild.channels.cache.find(
      c =>
        c.type ===
          ChannelType.GuildCategory &&
        c.name ===
          "☀️ SUMMER TIER LIST"
    );

  if (!category) return;

  for (const mode of MODE_KEYS) {

    const channel =
      guild.channels.cache.find(
        c =>
          c.parentId === category.id &&
          (
            c.name ===
              `${modeInfo(mode).emoji}・${mode}-waitlist`
          )
      );

    if (!channel) continue;

    let messages;

    try {

      messages =
        await channel.messages.fetch({
          limit: 50
        });

    } catch {
      continue;
    }

    const panel =
      messages.find(
        message =>
          message.author.id ===
            client.user.id &&
          message.embeds.length > 0 &&
          message.embeds[0].footer?.text ===
            `Summer Tier List • ${mode}`
      );

    if (panel) {

      await updateWaitlistPanel(
        channel,
        mode,
        panel
      );
    }
  }
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

  let channel =
    guild.channels.cache.find(
      c =>
        c.type === ChannelType.GuildText &&
        (
          c.name ===
            "🎫・ticket-panel" ||
          c.name ===
            "ticket-panel"
        )
    );

  if (!channel) {

    channel =
      await guild.channels.create({
        name:
          "🎫・ticket-panel",
        type:
          ChannelType.GuildText,
        parent:
          category.id
      });

  } else {

    if (
      channel.name !==
        "🎫・ticket-panel"
    ) {

      await channel.setName(
        "🎫・ticket-panel"
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

  if (!existing) {

    const embed =
      new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(
          "🎫  SUMMER TIER LIST"
        )
        .setDescription(
          [
            "## Support & Applications",
            "",
            "¿Necesitas ayuda o quieres solicitar algo?",
            "",
            "Selecciona la opción correspondiente",
            "después de pulsar **Open Ticket**.",
            "",
            "━━━━━━━━━━━━━━━━━━━━",
            "",
            "🛡️ **Support**",
            "Ayuda general, problemas o dudas.",
            "",
            "🧪 **Tester Application**",
            "Solicita entrar al equipo de testers.",
            "",
            "👑 **Staff Application**",
            "Solicita entrar al staff.",
            "",
            "🔥 **High Test**",
            "Solicita un High Test mediante soporte.",
            "",
            "━━━━━━━━━━━━━━━━━━━━",
            "",
            "🔒 Cada usuario puede tener un ticket abierto.",
            "🤝 Trata al staff con respeto.",
            "",
            "**Summer Tier List • Official**"
          ].join("\n")
        )
        .setFooter({
          text:
            "Summer Tier List • Ticket Panel"
        })
        .setTimestamp();

    const row =
      new ActionRowBuilder()
        .addComponents(
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
            )
        );

    await channel.send({
      embeds: [embed],
      components: [row]
    });
  }

  return channel;
}

/* =========================================================
   CREAR ESTRUCTURA
========================================================= */

async function setupServer(
  guild
) {

  const mainCategory =
    await getOrCreateCategory(
      guild,
      "☀️ SUMMER TIER LIST"
    );

  for (const mode of MODE_KEYS) {

    await createWaitlistChannel(
      guild,
      mainCategory,
      mode
    );
  }

  const generalChannels = [
    {
      name: "📊・results",
      key: "results"
    },
    {
      name: "🏆・high-results",
      key: "highResults"
    },
    {
      name: "🆘・support",
      key: "support"
    },
    {
      name: "📋・staff-logs",
      key: "logs"
    }
  ];

  for (const data of generalChannels) {

    let channel =
      guild.channels.cache.find(
        c =>
          c.type === ChannelType.GuildText &&
          c.name === data.name
      );

    if (!channel) {

      await guild.channels.create({
        name: data.name,
        type: ChannelType.GuildText,
        parent: mainCategory.id
      });
    }
  }

  await createTicketPanel(
    guild
  );

  await createStaffRoles(
    guild
  );

  return mainCategory;
}

/* =========================================================
   INTERACCIONES
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

        if (command === "ping") {

          await interaction.reply({
            content:
              `🏓 Pong!\n\nLatency: **${client.ws.ping}ms**`,
            ephemeral: true
          });

          return;
        }

        /* =========================
           SETUP
        ========================= */

        if (command === "setup") {

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
              "╭──────────────────────╮",
              "│  ✦ SERVER SETUP DONE  │",
              "╰──────────────────────╯",
              "",
              "🟢 **Waitlists:** 5",
              "🎫 **Ticket system:** Ready",
              "👑 **Staff roles:** Ready",
              "📊 **Results:** Ready",
              "🏆 **High Results:** Ready",
              "",
              "🟠 NetPot",
              "🧪 UHC",
              "⚔️ Sword",
              "📦 BoxPvP",
              "💎 CrystalPvP",
              "",
              "✨ Todos los paneles fueron creados automáticamente."
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

          await interaction.deferReply({
            ephemeral: true
          });

          await setupServer(
            interaction.guild
          );

          await interaction.editReply(
            "✅ **Los 5 paneles de waitlist están configurados y actualizados.**"
          );

          return;
        }

        /* =========================
           WAITLIST ON/OFF
        ========================= */

        if (
          command ===
          "waitlist"
        ) {

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

          saveDB(db);

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
           RESET
        ========================= */

        if (command === "reset") {

          await interaction.deferReply({
            ephemeral: true
          });

          const guild =
            interaction.guild;

          const names = [
            "☀️ SUMMER TIER LIST",
            "🎫 TICKETS"
          ];

          let deleted = 0;

          for (const name of names) {

            const category =
              guild.channels.cache.find(
                c =>
                  c.type ===
                    ChannelType.GuildCategory &&
                  c.name === name
              );

            if (!category) continue;

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

              try {

                await channel.delete(
                  "Summer Tier List reset"
                );

                deleted++;

              } catch {}
            }

            try {

              await category.delete(
                "Summer Tier List reset"
              );

            } catch {}
          }

          db =
            defaultDatabase();

          saveDB(db);

          await interaction.editReply(
            [
              "🧹 **SUMMER TIER LIST RESET**",
              "",
              `🗑️ Canales eliminados: **${deleted}**`,
              "💾 Base de datos reiniciada.",
              "",
              "Puedes ejecutar **/setup** nuevamente."
            ].join("\n")
          );

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
              "👑 **STAFF SYSTEM**",
              "",
              "Los rangos oficiales fueron configurados.",
              "",
              "👑 Owner",
              "🛡️ Administrator",
              "🔨 Moderator",
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
           RESULT
        ========================= */

        if (
          command === "result" ||
          command === "highresult"
        ) {

          if (
            !isStaff(
              interaction.member
            )
          ) {

            await interaction.reply({
              content:
                "❌ No tienes permiso para registrar resultados.",
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

          const tier =
            interaction.options.getString(
              "tier"
            );

          const minecraft =
            interaction.options.getString(
              "minecraft"
            );

          const high =
            command ===
            "highresult";

          const result = {
            userId:
              player.id,

            discord:
              player.tag,

            minecraft,

            mode,

            tier,

            tester:
              interaction.user.tag,

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
           * EL COOLDOWN SOLO SE CREA
           * CUANDO HAY RESULTADO.
           */

          setCooldown(
            player.id,
            mode
          );

          /*
           * Sacarlo de la waitlist.
           */

          db.waitlists[mode] =
            db.waitlists[mode].filter(
              id =>
                id !== player.id
            );

          saveDB(db);

          await updateAllWaitlistPanels(
            interaction.guild
          );

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

          const embed =
            new EmbedBuilder()
              .setColor(
                high
                  ? 0xF1C40F
                  : 0x5865F2
              )
              .setTitle(
                high
                  ? "🏆 HIGH TEST RESULT"
                  : "📊 TEST RESULT"
              )
              .setDescription(
                [
                  `## ${MODES[mode].emoji} ${MODES[mode].name}`,
                  "",
                  `👤 **Player:** <@${player.id}>`,
                  `⛏️ **Minecraft:** \`${minecraft}\``,
                  `🏅 **Tier:** \`${tier}\``,
                  `🧪 **Tester:** <@${interaction.user.id}>`,
                  "",
                  "━━━━━━━━━━━━━━━━━━━━",
                  "",
                  "☀️ **Summer Tier List**"
                ].join("\n")
              )
              .setTimestamp();

          if (channel) {

            await channel.send({
              embeds: [embed]
            });
          }

          await interaction.reply({
            content:
              `✅ Resultado registrado para **${player.tag}** en **${MODES[mode].name} — ${tier}**.\n⏱️ Cooldown aplicado: **3 días**.`,
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
              .setColor(0x5865F2)
              .setTitle(
                "📊  SUMMER TIER LIST • RESULTS"
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
            embeds: [embed]
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
                  ? 0x2ECC71
                  : 0xE74C3C
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
            embeds: [embed],
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
            ].filter(
              result =>
                result.userId ===
                user.id
            );

          const cooldowns =
            MODE_KEYS.filter(
              mode =>
                getCooldown(
                  user.id,
                  mode
                ) > Date.now()
            );

          const modeLines =
            MODE_KEYS.map(
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
            ).join("\n");

          const embed =
            new EmbedBuilder()
              .setColor(0xF1C40F)
              .setAuthor({
                name:
                  user.tag,
                iconURL:
                  user.displayAvatarURL()
              })
              .setTitle(
                "☀️  PLAYER PROFILE"
              )
              .setDescription(
                [
                  `👤 **Discord:** <@${user.id}>`,
                  "",
                  "### 🏅 Rankings",
                  modeLines,
                  "",
                  "### 📈 Statistics",
                  `• Tests: **${results.length}**`,
                  `• Cooldowns: **${cooldowns.length}**`
                ].join("\n")
              )
              .setFooter({
                text:
                  "Summer Tier List • Official Profile"
              })
              .setTimestamp();

          await interaction.reply({
            embeds: [embed]
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
                ? `🎫 Puedes abrir un ticket aquí: ${channel}`
                : "❌ El panel de tickets todavía no está configurado.",
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
          !MODE_KEYS.includes(mode)
        ) {
          return;
        }

        /* =========================
           JOIN
        ========================= */

        if (action === "join") {

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
                `⏳ Tienes cooldown en **${MODES[mode].name}**.\n\nTiempo restante: **${formatRemaining(cooldown - Date.now())}**.`,
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

          saveDB(db);

          await updateAllWaitlistPanels(
            interaction.guild
          );

          await interaction.reply({
            content:
              `✅ Entraste a **${MODES[mode].name} Waitlist**.\n\n📍 Posición: **${db.waitlists[mode].length}**`,
            ephemeral: true
          });

          return;
        }

        /* =========================
           LEAVE
        ========================= */

        if (
          action === "leave"
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

          saveDB(db);

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
          action === "view"
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
              .setColor(0x5865F2)
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
            embeds: [embed],
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
                  "Ayuda general o problemas"
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
                  "Solicitar un High Test"
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
              .addComponents(menu)
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
            .slice(0, 95);

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

          if (!role) continue;

          overwrites.push({
            id: role.id,
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

        if (type === "tester") {

          title =
            "🧪 Tester Application";

          description =
            "Completa la aplicación para solicitar entrar al equipo de testers.";
        }

        if (type === "staff") {

          title =
            "👑 Staff Application";

          description =
            "Completa la aplicación para solicitar entrar al staff.";
        }

        if (type === "high") {

          title =
            "🔥 High Test";

          description =
            "Explica tu solicitud de High Test. Un miembro autorizado revisará tu caso.";
        }

        const embed =
          new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle(title)
            .setDescription(
              [
                description,
                "",
                "━━━━━━━━━━━━━━━━━━━━",
                "",
                `👤 **Usuario:** <@${interaction.user.id}>`,
                "",
                "🔒 Este ticket es privado."
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
                type === "tester"
                  ? "Complete Application"
                  : "Complete Application"
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
          embeds: [embed],
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

        saveDB(db);

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
            .setRequired(true)
            .setMaxLength(50);

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
            .setRequired(true)
            .setMaxLength(1000);

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
            .setRequired(true)
            .setMaxLength(1000);

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

        saveDB(db);

        const embed =
          new EmbedBuilder()
            .setColor(0x2ECC71)
            .setTitle(
              type === "tester"
                ? "🧪 TESTER APPLICATION"
                : "👑 STAFF APPLICATION"
            )
            .addFields(
              {
                name:
                  "⛏️ Minecraft",
                value:
                  minecraft
              },
              {
                name:
                  "📖 Experiencia",
                value:
                  experience
              },
              {
                name:
                  "💬 Motivo",
                value:
                  reason
              }
            )
            .setFooter({
              text:
                `Application • ${interaction.user.tag}`
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

          saveDB(db);
        }

        await interaction.reply(
          {
            content:
              "🔒 **Ticket cerrado.**\n\n⏱️ Cerrar un ticket **no genera cooldown**."
          }
        );

        setTimeout(
          async () => {

            try {

              await interaction.channel.delete(
                "Summer Tier List ticket closed"
              );

            } catch {}
          },
          5000
        );

        return;
      }

    } catch (error) {

      console.error(
        "❌ Error procesando interacción:"
      );

      console.error(error);

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

client.login(TOKEN);
