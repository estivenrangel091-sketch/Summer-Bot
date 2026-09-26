require("dotenv").config();

const {
  Client,
  Collection,
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
  TextInputStyle
} = require("discord.js");

const {
  MODE_KEYS,
  modeInfo,
  getConfig,
  getDB,
  saveDB,
  setCooldown,
  getCooldown
} = require("./botData");

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.commands = new Collection();

/* =========================
   COMANDOS
========================= */

const commandFiles = [
  "ping.js",
  "profile.js",
  "queue.js",
  "result.js",
  "results.js",
  "setup.js",
  "setupwaitlist.js",
  "support.js",
  "highresults.js",
  "reset.js",
  "staffsetup.js"
];

const loadedCommands = new Set();
const commandSources = new Map();

for (const file of commandFiles) {
  try {
    if (loadedCommands.has(file)) {
      console.log(`⚠️ Archivo duplicado ignorado: ${file}`);
      continue;
    }

    loadedCommands.add(file);

    const command = require(`./${file}`);

    if (!command?.data?.name) {
      console.log(`⚠️ ${file} no contiene command.data`);
      continue;
    }

    const commandName = command.data.name;

    if (client.commands.has(commandName)) {
      const previousFile = commandSources.get(commandName);

      console.log("");
      console.log("================================");
      console.log(`❌ COMANDO DUPLICADO DETECTADO`);
      console.log(`Comando: /${commandName}`);
      console.log(`Archivo anterior: ${previousFile}`);
      console.log(`Archivo duplicado: ${file}`);
      console.log("================================");
      console.log("");

      continue;
    }

    client.commands.set(commandName, command);
    commandSources.set(commandName, file);

    console.log(`Preparado: /${commandName} ← ${file}`);

  } catch (error) {
    console.error(`❌ Error cargando ${file}`);
    console.error(error);
  }
}
/* =========================
   READY
========================= */

client.once(Events.ClientReady, () => {
  console.log("");
  console.log("================================");
  console.log(`☀️ Summer Tier List online`);
  console.log(`🤖 Bot: ${client.user.tag}`);
  console.log(`📦 Comandos: ${client.commands.size}`);
  console.log("================================");
  console.log("");
});

/* =========================
   INTERACCIONES
========================= */

client.on(Events.InteractionCreate, async interaction => {
  try {

    /* =========================
       SLASH COMMANDS
    ========================= */

    if (interaction.isChatInputCommand()) {

      const command = client.commands.get(
        interaction.commandName
      );

      if (!command) {
        await interaction.reply({
          content: "❌ Este comando no está disponible.",
          ephemeral: true
        }).catch(() => {});

        return;
      }

      await command.execute(interaction);

      return;
    }

    /* =========================
       OPEN TICKET
    ========================= */

    if (
      interaction.isButton() &&
      interaction.customId === "support:open"
    ) {

      const menu = new StringSelectMenuBuilder()
        .setCustomId("ticket:type")
        .setPlaceholder("Selecciona el tipo de ticket")
        .addOptions(

          new StringSelectMenuOptionBuilder()
            .setLabel("Support")
            .setDescription("Ayuda general o problemas")
            .setEmoji("🛡️")
            .setValue("support"),

          new StringSelectMenuOptionBuilder()
            .setLabel("Tester Application")
            .setDescription("Aplicar para Tester")
            .setEmoji("🧪")
            .setValue("tester"),

          new StringSelectMenuOptionBuilder()
            .setLabel("Staff Application")
            .setDescription("Aplicar para Staff")
            .setEmoji("👑")
            .setValue("staff"),

          new StringSelectMenuOptionBuilder()
            .setLabel("High Test")
            .setDescription("Solicitar un High Test")
            .setEmoji("🔥")
            .setValue("high")
        );

      const row = new ActionRowBuilder()
        .addComponents(menu);

      await interaction.reply({
        content:
          "🎫 **Selecciona el tipo de ticket que deseas abrir:**",
        components: [row],
        ephemeral: true
      });

      return;
    }

    /* =========================
       TICKET TYPE
    ========================= */

    if (
      interaction.isStringSelectMenu() &&
      interaction.customId === "ticket:type"
    ) {

      const type = interaction.values[0];

      const db = getDB();

      const guild = interaction.guild;

      if (!guild) return;

      let category = guild.channels.cache.find(
        channel =>
          channel.type === ChannelType.GuildCategory &&
          channel.name === "🎫 TICKETS"
      );

      if (!category) {

        category = await guild.channels.create({
          name: "🎫 TICKETS",
          type: ChannelType.GuildCategory
        });
      }

      /* =========================
         COMPROBAR TICKET EXISTENTE
      ========================= */

      const existing = guild.channels.cache.find(
        channel =>
          channel.parentId === category.id &&
          channel.topic ===
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

      /* =========================
         NOMBRES
      ========================= */

      const names = {
        support: "support",
        tester: "tester-application",
        staff: "staff-application",
        high: "high-test"
      };

      let username = interaction.user.username
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "");

      if (!username) {
        username = interaction.user.id;
      }

      const channelName =
        `${names[type]}-${username}`.slice(0, 95);

      /* =========================
         PERMISOS
      ========================= */

      const permissionOverwrites = [
        {
          id: guild.roles.everyone.id,
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

      /* =========================
         ROLES STAFF
      ========================= */

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

      for (const roleName of staffRoleNames) {

        const role = guild.roles.cache.find(
          r => r.name === roleName
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

      /* =========================
         CREAR TICKET
      ========================= */

      const channel = await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        parent: category.id,
        topic: `ticket-owner:${interaction.user.id}`,
        permissionOverwrites
      });

      /* =========================
         BOTÓN CERRAR
      ========================= */

      const closeButton = new ButtonBuilder()
        .setCustomId("ticket:close")
        .setLabel("Cerrar Ticket")
        .setEmoji("🔒")
        .setStyle(ButtonStyle.Danger);

      const closeRow =
        new ActionRowBuilder()
          .addComponents(closeButton);

      /* =========================
         DESCRIPCIONES
      ========================= */

      let description = "";

      if (type === "support") {

        description =
          "Describe tu problema o pregunta y un miembro del staff te ayudará.";
      }

      if (type === "tester") {

        description =
          "Para aplicar como Tester, pulsa el botón de abajo y completa la aplicación.";
      }

      if (type === "staff") {

        description =
          "Para aplicar como Staff, pulsa el botón de abajo y completa la aplicación.";
      }

      if (type === "high") {

        description =
          "Explica por qué deseas realizar un High Test. Un miembro autorizado revisará tu solicitud.";
      }

      /* =========================
         EMBED
      ========================= */

      const embed = new EmbedBuilder()
        .setTitle(
          type === "high"
            ? "🔥 High Test"
            : "🎫 Summer Tier List"
        )
        .setDescription(description)
        .setColor(0xF1C40F)
        .setFooter({
          text: "Summer Tier List"
        })
        .setTimestamp();

      const components = [closeRow];

      /* =========================
         BOTÓN APPLICATION
      ========================= */

      if (
        type === "tester" ||
        type === "staff"
      ) {

        const applyButton = new ButtonBuilder()
          .setCustomId(
            `ticket:application:${type}`
          )
          .setLabel(
            type === "tester"
              ? "Completar aplicación de Tester"
              : "Completar aplicación de Staff"
          )
          .setEmoji(
            type === "tester"
              ? "🧪"
              : "👑"
          )
          .setStyle(ButtonStyle.Primary);

        components.unshift(
          new ActionRowBuilder()
            .addComponents(applyButton)
        );
      }

      /* =========================
         ENVIAR TICKET
      ========================= */

      await channel.send({
        content:
          `<@${interaction.user.id}>`,
        embeds: [embed],
        components
      });

      /* =========================
         GUARDAR TICKET
      ========================= */

      db.tickets ??= [];

      db.tickets.push({
        channelId: channel.id,
        userId: interaction.user.id,
        type,
        createdAt: Date.now(),
        closed: false
      });

      saveDB(db);

      await interaction.reply({
        content:
          `✅ Ticket creado correctamente: ${channel}`,
        ephemeral: true
      });

      return;
    }

    /* =========================
       APPLICATION BUTTON
    ========================= */

    if (
      interaction.isButton() &&
      interaction.customId.startsWith(
        "ticket:application:"
      )
    ) {

      const type =
        interaction.customId.split(":")[2];

      const modal = new ModalBuilder()
        .setCustomId(
          `application:${type}`
        )
        .setTitle(
          type === "tester"
            ? "Tester Application"
            : "Staff Application"
        );

      const username = new TextInputBuilder()
        .setCustomId("minecraft")
        .setLabel("Minecraft Username")
        .setPlaceholder(
          "Tu nombre de Minecraft"
        )
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(50);

      const experience = new TextInputBuilder()
        .setCustomId("experience")
        .setLabel("Experiencia")
        .setPlaceholder(
          "Cuéntanos sobre tu experiencia"
        )
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setMaxLength(1000);

      const reason = new TextInputBuilder()
        .setCustomId("reason")
        .setLabel("¿Por qué quieres entrar?")
        .setPlaceholder(
          "Explica tu motivo"
        )
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setMaxLength(1000);

      modal.addComponents(
        new ActionRowBuilder()
          .addComponents(username),

        new ActionRowBuilder()
          .addComponents(experience),

        new ActionRowBuilder()
          .addComponents(reason)
      );

      await interaction.showModal(modal);

      return;
    }

    /* =========================
       APPLICATION SUBMIT
    ========================= */

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

      const db = getDB();

      db.applications ??= [];

      db.applications.push({
        userId: interaction.user.id,
        type,
        minecraft,
        experience,
        reason,
        createdAt: Date.now()
      });

      saveDB(db);

      const embed = new EmbedBuilder()
        .setTitle(
          type === "tester"
            ? "🧪 Tester Application"
            : "👑 Staff Application"
        )
        .addFields(
          {
            name: "Minecraft",
            value: minecraft
          },
          {
            name: "Experiencia",
            value: experience
          },
          {
            name: "Motivo",
            value: reason
          }
        )
        .setFooter({
          text:
            `Aplicación de ${interaction.user.tag}`
        })
        .setTimestamp();

      await interaction.channel.send({
        embeds: [embed]
      });

      await interaction.reply({
        content:
          "✅ Tu aplicación fue enviada dentro del ticket.",
        ephemeral: true
      });

      return;
    }

    /* =========================
       JOIN WAITLIST
    ========================= */

    if (
      interaction.isButton() &&
      interaction.customId.startsWith(
        "waitlist:join:"
      )
    ) {

      const mode =
        interaction.customId.split(":")[2];

      if (!MODE_KEYS.includes(mode)) return;

      const db = getDB();

      db.waitlists ??= {};

      for (const key of MODE_KEYS) {
        db.waitlists[key] ??= [];
      }

      const cooldown =
        getCooldown(
          db,
          interaction.user.id,
          mode
        );

      if (cooldown > Date.now()) {

        const remaining =
          cooldown - Date.now();

        const days = Math.ceil(
          remaining /
          (1000 * 60 * 60 * 24)
        );

        await interaction.reply({
          content:
            `⏳ Tienes cooldown en **${modeInfo(mode).name}** durante aproximadamente **${days} día(s)**.`,
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

      await interaction.reply({
        content:
          `✅ Entraste a la waitlist de **${modeInfo(mode).name}**.`,
        ephemeral: true
      });

      return;
    }

    /* =========================
       LEAVE WAITLIST
    ========================= */

    if (
      interaction.isButton() &&
      interaction.customId.startsWith(
        "waitlist:leave:"
      )
    ) {

      const mode =
        interaction.customId.split(":")[2];

      if (!MODE_KEYS.includes(mode)) return;

      const db = getDB();

      db.waitlists ??= {};
      db.waitlists[mode] ??= [];

      db.waitlists[mode] =
        db.waitlists[mode].filter(
          id =>
            id !== interaction.user.id
        );

      saveDB(db);

      await interaction.reply({
        content:
          `✅ Saliste de la waitlist de **${modeInfo(mode).name}**.`,
        ephemeral: true
      });

      return;
    }

    /* =========================
       VIEW QUEUE
    ========================= */

    if (
      interaction.isButton() &&
      interaction.customId.startsWith(
        "waitlist:view:"
      )
    ) {

      const mode =
        interaction.customId.split(":")[2];

      if (!MODE_KEYS.includes(mode)) return;

      const db = getDB();

      const queue =
        db.waitlists?.[mode] ?? [];

      if (!queue.length) {

        await interaction.reply({
          content:
            "📭 La waitlist está vacía.",
          ephemeral: true
        });

        return;
      }

      const list = queue
        .map(
          (id, index) =>
            `${index + 1}. <@${id}>`
        )
        .join("\n");

      await interaction.reply({
        content:
          `### ${modeInfo(mode).emoji} ${modeInfo(mode).name} Waitlist\n\n${list}`,
        ephemeral: true
      });

      return;
    }

    /* =========================
       CLOSE TICKET
    ========================= */

    if (
      interaction.isButton() &&
      interaction.customId === "ticket:close"
    ) {

      const db = getDB();

      const ticket =
        db.tickets?.find(
          t =>
            t.channelId ===
            interaction.channel.id
        );

      if (ticket) {

        ticket.closed = true;
        ticket.closedAt = Date.now();

        /*
         * IMPORTANTE:
         * Cerrar el ticket NO genera cooldown.
         */

        saveDB(db);
      }

      await interaction.reply(
        "🔒 Ticket cerrado.\n\n" +
        "ℹ️ El cierre del ticket **no genera cooldown**."
      );

      setTimeout(async () => {

        try {
          await interaction.channel.delete(
            "Ticket cerrado"
          );
        } catch {}

      }, 5000);

      return;
    }

  } catch (error) {

    console.error(
      "❌ Error en interacción:"
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
});

/* =========================
   LOGIN
========================= */

const TOKEN =
  process.env.DISCORD_TOKEN ||
  process.env.TOKEN;

if (!TOKEN) {

  console.error(
    "❌ Falta DISCORD_TOKEN en las variables de entorno."
  );

  process.exit(1);
}

client.login(TOKEN);
