require("dotenv").config();

const fs = require("node:fs");
const path = require("node:path");
const {
  Client, Collection, GatewayIntentBits, Events, ChannelType,
  PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder,
  ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle
} = require("discord.js");

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

client.commands = new Collection();

// Archivos directamente en la raíz del proyecto
const DB_FILE = path.join(__dirname, "database.json");
const CONFIG_FILE = path.join(__dirname, "config.json");

function read(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function write(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function getDB() {
  return read(DB_FILE, {
    waitlists: {
      netpot: [],
      uhc: [],
      sword: [],
      boxpvp: [],
      crystalpvp: []
    },
    cooldowns: {},
    profiles: {},
    results: [],
    highResults: [],
    applications: [],
    tickets: []
  });
}

function getConfig() {
  return read(CONFIG_FILE, {
    guildId: "",
    categoryId: "",
    channels: {
      waitlists: {},
      results: "",
      highResults: "",
      support: "",
      applications: "",
      logs: ""
    },
    roles: {}
  });
}

function saveDB(db) {
  write(DB_FILE, db);
}

function saveConfig(c) {
  write(CONFIG_FILE, c);
}

const MODES = {
  netpot: { name: "NetPot", emoji: "🟠" },
  uhc: { name: "UHC", emoji: "🧪" },
  sword: { name: "Sword", emoji: "⚔️" },
  boxpvp: { name: "BoxPvP", emoji: "📦" },
  crystalpvp: { name: "CrystalPvP", emoji: "💎" }
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

const MODE_KEYS = Object.keys(MODES);

function modeInfo(mode) {
  return MODES[mode] || {
    name: mode,
    emoji: "🎮"
  };
}

/*
 * CARGAR COMANDOS DESDE LA RAÍZ
 * Tus archivos .js están directamente en Summer-Bot/
 */
const commandFiles = [
  "apply.js",
  "highresults.js",
  "ping.js",
  "profile.js",
  "queue.js",
  "result.js",
  "results.js",
  "setup.js",
  "setupwaitlist.js",
  "support.js"
];

for (const file of commandFiles) {
  const filePath = path.join(__dirname, file);

  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️ No se encontró el comando: ${file}`);
    continue;
  }

  try {
    const command = require(filePath);

    if (command.data && command.execute) {
      client.commands.set(command.data.name, command);
      console.log(`✅ Comando cargado: ${command.data.name}`);
    } else {
      console.warn(`⚠️ ${file} no tiene data o execute.`);
    }
  } catch (error) {
    console.error(`❌ Error cargando ${file}:`, error);
  }
}

function waitEmbed(mode, db) {
  const info = modeInfo(mode);
  const q = db.waitlists[mode] || [];

  const list = q.length
    ? q.map((id, i) => `**${i + 1}.** <@${id}>`).join("\n")
    : "*The waitlist is currently empty.*";

  return new EmbedBuilder()
    .setColor(0x2f8cff)
    .setTitle("☀️ SUMMER TIER LIST")
    .setDescription(
      `**${info.emoji} ${info.name.toUpperCase()} WAITLIST**\n` +
      `━━━━━━━━━━━━━━━━━━━━\n\n` +
      `Official ${info.name} testing queue.\n\n` +
      `👥 **Players waiting:** ${q.length}\n` +
      `🟢 **Status:** OPEN\n\n` +
      `### Queue\n${list}`
    )
    .setFooter({
      text: "Summer Tier List • Official Testing"
    })
    .setTimestamp();
}

function waitButtons(mode) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`join:${mode}`)
      .setLabel("Join Waitlist")
      .setEmoji("➕")
      .setStyle(ButtonStyle.Success),

    new ButtonBuilder()
      .setCustomId(`leave:${mode}`)
      .setLabel("Leave Waitlist")
      .setEmoji("➖")
      .setStyle(ButtonStyle.Danger),

    new ButtonBuilder()
      .setCustomId(`queue:${mode}`)
      .setLabel("View Queue")
      .setEmoji("📋")
      .setStyle(ButtonStyle.Secondary)
  );
}

async function refreshWaitlist(guild, mode) {
  const c = getConfig();
  const id = c.channels?.waitlists?.[mode];

  if (!id) return;

  const ch = guild.channels.cache.get(id);

  if (!ch) return;

  const msgs = await ch.messages.fetch({
    limit: 30
  }).catch(() => null);

  if (!msgs) return;

  const msg = msgs.find(
    m =>
      m.author.id === client.user.id &&
      m.embeds[0]?.title === "☀️ SUMMER TIER LIST"
  );

  const payload = {
    embeds: [waitEmbed(mode, getDB())],
    components: [waitButtons(mode)]
  };

  if (msg) {
    await msg.edit(payload).catch(() => {});
  } else {
    await ch.send(payload).catch(() => {});
  }
}

async function refreshAllWaitlists(guild) {
  for (const mode of MODE_KEYS) {
    await refreshWaitlist(guild, mode);
  }
}

async function setupGuild(guild) {
  const config = getConfig();

  let category = guild.channels.cache.get(config.categoryId);

  if (!category || category.type !== ChannelType.GuildCategory) {
    category = await guild.channels.create({
      name: "☀️ SUMMER TIER LIST",
      type: ChannelType.GuildCategory
    });
  }

  config.guildId = guild.id;
  config.categoryId = category.id;

  config.channels.waitlists =
    config.channels.waitlists || {};

  for (const mode of MODE_KEYS) {
    let ch = guild.channels.cache.get(
      config.channels.waitlists[mode]
    );

    if (!ch) {
      ch = await guild.channels.create({
        name: `${mode}-waitlist`,
        type: ChannelType.GuildText,
        parent: category.id,
        topic: `☀️ Summer Tier List — ${modeInfo(mode).name} official waitlist`
      });
    }

    config.channels.waitlists[mode] = ch.id;
  }

  async function ensureChannel(key, name) {
    let ch = guild.channels.cache.get(config.channels[key]);

    if (!ch) {
      ch = await guild.channels.create({
        name,
        type: ChannelType.GuildText,
        parent: category.id
      });
    }

    config.channels[key] = ch.id;
    return ch;
  }

  await ensureChannel("results", "results");
  await ensureChannel("highResults", "high-results");
  await ensureChannel("support", "support");
  await ensureChannel("applications", "applications");
  await ensureChannel("logs", "staff-logs");

  saveConfig(config);

  await refreshAllWaitlists(guild);

  return (
    `☀️ **Summer Tier List configurado.**\n\n` +
    `Waitlists independientes creadas: ` +
    `${MODE_KEYS.map(m => `#${m}-waitlist`).join(", ")}\n\n` +
    `🏆 #results\n` +
    `🔥 #high-results\n` +
    `🛡️ #support\n` +
    `📋 #applications\n` +
    `📜 #staff-logs`
  );
}

async function createTicket(interaction, type) {
  const config = getConfig();

  const category = guildCategory(
    interaction.guild,
    "☀️ SUPPORT"
  );

  const safe =
    interaction.user.username
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .slice(0, 15) || "player";

  const ch = await interaction.guild.channels.create({
    name: `${type}-${safe}`,
    type: ChannelType.GuildText,
    parent: category?.id || null,

    permissionOverwrites: [
      {
        id: interaction.guild.roles.everyone.id,
        deny: [PermissionFlagsBits.ViewChannel]
      },
      {
        id: interaction.user.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory
        ]
      }
    ]
  });

  const staffRoles = [
    "tester",
    "staff",
    "highStaff"
  ]
    .map(k => config.roles[k])
    .filter(Boolean);

  for (const roleId of staffRoles) {
    await ch.permissionOverwrites
      .create(roleId, {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true
      })
      .catch(() => {});
  }

  const title =
    type === "high"
      ? "🔥 HIGH TEST REQUEST"
      : "🛡️ SUPPORT TICKET";

  const embed = new EmbedBuilder()
    .setColor(
      type === "high"
        ? 0xf5b642
        : 0x2f8cff
    )
    .setTitle(
      `☀️ SUMMER TIER LIST\n${title}`
    )
    .setDescription(
      `━━━━━━━━━━━━━━━━━━━━\n\n` +
      `👤 **Player:** <@${interaction.user.id}>\n` +
      `📌 **Type:** ${
        type === "high"
          ? "High Test"
          : "Support"
      }\n\n` +
      (
        type === "high"
          ? `A High Test is requested through Support. Staff/authorized testers will review this ticket and handle the test.\n\n`
          : `Please explain your issue and wait for a staff member.\n\n`
      ) +
      `🔒 Use the button below when the ticket is finished.`
    );

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("ticket:close")
      .setLabel("Close Ticket")
      .setEmoji("🔒")
      .setStyle(ButtonStyle.Danger)
  );

  await ch.send({
    content: `<@${interaction.user.id}>`,
    embeds: [embed],
    components: [row]
  });

  const db = getDB();

  db.tickets.push({
    channelId: ch.id,
    userId: interaction.user.id,
    type,
    createdAt: Date.now()
  });

  saveDB(db);

  return ch;
}

function guildCategory(guild, name) {
  return guild.channels.cache.find(
    c =>
      c.type === ChannelType.GuildCategory &&
      c.name === name
  );
}

async function showApplicationModal(interaction, type) {
  const modal = new ModalBuilder()
    .setCustomId(`apply:${type}`)
    .setTitle(
      `${
        type === "tester"
          ? "Tester"
          : type === "hightester"
          ? "High Tester"
          : "Staff"
      } Application`
    );

  const fields =
    type === "staff"
      ? [
          ["age", "Age", "Your age", false],
          ["ign", "Minecraft IGN", "Minecraft username", true],
          ["experience", "Experience", "Previous staff/testing experience", true],
          ["why", "Why you?", "Why should we choose you?", true]
        ]
      : [
          ["ign", "Minecraft IGN", "Minecraft username", true],
          ["region", "Region", "NA / EU / AS / LATAM / OCE", true],
          ["experience", "Experience", "PvP/testing experience", true],
          ["why", "Why you?", "Why should you become a tester?", true]
        ];

  const rows = fields.map(
    ([id, label, ph, req]) =>
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId(id)
          .setLabel(label)
          .setPlaceholder(ph)
          .setRequired(req)
          .setStyle(
            id === "why" || id === "experience"
              ? TextInputStyle.Paragraph
              : TextInputStyle.Short
          )
      )
  );

  modal.addComponents(...rows.slice(0, 5));

  await interaction.showModal(modal);
}

client.on(
  Events.InteractionCreate,
  async interaction => {
    try {
      if (interaction.isChatInputCommand()) {
        const cmd = client.commands.get(
          interaction.commandName
        );

        if (cmd) {
          await cmd.execute(interaction);
        }

        return;
      }

      if (interaction.isButton()) {
        const [action, value] =
          interaction.customId.split(":");

        if (action === "join" || action === "leave") {
          const db = getDB();
          const q = db.waitlists[value];

          if (!q) {
            return interaction.reply({
              content: "Modalidad inválida.",
              ephemeral: true
            });
          }

          if (action === "join") {
            const cooldown =
              db.cooldowns[
                `${interaction.user.id}:${value}`
              ] || 0;

            if (Date.now() < cooldown) {
              return interaction.reply({
                content:
                  `⏱️ Tienes cooldown en **${modeInfo(value).name}**.`,
                ephemeral: true
              });
            }

            if (q.includes(interaction.user.id)) {
              return interaction.reply({
                content:
                  "Ya estás en esta waitlist.",
                ephemeral: true
              });
            }

            q.push(interaction.user.id);

            saveDB(db);

            await refreshWaitlist(
              interaction.guild,
              value
            );

            return interaction.reply({
              content:
                `✅ Entraste a la waitlist de **${modeInfo(value).name}** en la posición **${q.length}**.`,
              ephemeral: true
            });
          } else {
            const i = q.indexOf(
              interaction.user.id
            );

            if (i === -1) {
              return interaction.reply({
                content:
                  "No estás en esta waitlist.",
                ephemeral: true
              });
            }

            q.splice(i, 1);

            saveDB(db);

            await refreshWaitlist(
              interaction.guild,
              value
            );

            return interaction.reply({
              content:
                "✅ Saliste de la waitlist.",
              ephemeral: true
            });
          }
        }

        if (action === "queue") {
          const db = getDB();
          const q = db.waitlists[value] || [];

          return interaction.reply({
            content: q.length
              ? q
                  .map(
                    (id, i) =>
                      `${i + 1}. <@${id}>`
                  )
                  .join("\n")
              : "La waitlist está vacía.",
            ephemeral: true
          });
        }

        if (action === "support") {
          await interaction.deferReply({
            ephemeral: true
          });

          const ch = await createTicket(
            interaction,
            value === "high"
              ? "high"
              : "support"
          );

          return interaction.editReply(
            `🎫 Ticket creado: ${ch}`
          );
        }

        if (
          action === "ticket" &&
          value === "close"
        ) {
          if (
            !interaction.member.permissions.has(
              PermissionFlagsBits.ManageChannels
            )
          ) {
            return interaction.reply({
              content:
                "Solo staff puede cerrar tickets.",
              ephemeral: true
            });
          }

          await interaction.reply(
            "🔒 Ticket cerrado."
          );

          setTimeout(() => {
            interaction.channel
              .delete()
              .catch(() => {});
          }, 3000);

          return;
        }
      }

      if (interaction.isModalSubmit()) {
        if (
          interaction.customId.startsWith("apply:")
        ) {
          const type =
            interaction.customId.split(":")[1];

          const db = getDB();

          const data = {
            type,
            userId: interaction.user.id,
            submittedAt: Date.now()
          };

          for (const id of [
            "age",
            "ign",
            "region",
            "experience",
            "why"
          ]) {
            if (
              interaction.fields.fields.has(id)
            ) {
              data[id] =
                interaction.fields.getTextInputValue(
                  id
                );
            }
          }

          db.applications.push(data);

          saveDB(db);

          const config = getConfig();

          const ch =
            config.channels.applications
              ? interaction.guild.channels.cache.get(
                  config.channels.applications
                )
              : null;

          if (ch) {
            await ch.send({
              embeds: [
                new EmbedBuilder()
                  .setColor(0x2f8cff)
                  .setTitle(
                    "📋 NEW APPLICATION"
                  )
                  .setDescription(
                    `**Type:** ${type}\n` +
                    `**Applicant:** <@${interaction.user.id}>\n\n` +
                    Object.entries(data)
                      .filter(
                        ([k]) =>
                          ![
                            "type",
                            "userId",
                            "submittedAt"
                          ].includes(k)
                      )
                      .map(
                        ([k, v]) =>
                          `**${k}:** ${v}`
                      )
                      .join("\n")
                  )
              ]
            });
          }

          return interaction.reply({
            content:
              "✅ Application enviada correctamente.",
            ephemeral: true
          });
        }
      }
    } catch (e) {
      console.error(e);

      if (
        interaction.replied ||
        interaction.deferred
      ) {
        interaction
          .followUp({
            content:
              "❌ Ocurrió un error.",
            ephemeral: true
          })
          .catch(() => {});
      } else {
        interaction
          .reply({
            content:
              "❌ Ocurrió un error.",
            ephemeral: true
          })
          .catch(() => {});
      }
    }
  }
);

client.once(
  Events.ClientReady,
  () => {
    console.log(
      `☀️ Summer Tier List online como ${client.user.tag}`
    );
  }
);

client.login(process.env.TOKEN);

module.exports = {
  getDB,
  saveDB,
  getConfig,
  saveConfig,
  modeInfo,
  MODES,
  TIERS,
  setupGuild,
  refreshWaitlist,
  refreshAllWaitlists,
  showApplicationModal
};
