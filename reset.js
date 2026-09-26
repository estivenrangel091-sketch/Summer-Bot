const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType
} = require("discord.js");

const fs = require("node:fs");
const path = require("node:path");

const CONFIG_FILE = path.join(__dirname, "config.json");
const DB_FILE = path.join(__dirname, "database.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("reset")
    .setDescription("Elimina la estructura de Summer Tier List.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const guild = interaction.guild;

    const categories = [
      "☀️ SUMMER TIER LIST",
      "🎫 TICKETS",
      "🔒 STAFF"
    ];

    const oldChannels = [
      "netpot-waitlist",
      "uhc-waitlist",
      "sword-waitlist",
      "boxpvp-waitlist",
      "crystalpvp-waitlist",

      "🟠・netpot-waitlist",
      "🧪・uhc-waitlist",
      "⚔️・sword-waitlist",
      "📦・boxpvp-waitlist",
      "💎・crystalpvp-waitlist",

      "results",
      "high-results",
      "support",
      "staff-logs",

      "📊・results",
      "🏆・high-results",
      "🆘・support",
      "📋・staff-logs",

      "ticket-panel",
      "🎫・ticket-panel"
    ];

    let deletedChannels = 0;
    let deletedCategories = 0;

    for (const categoryName of categories) {
      const category = guild.channels.cache.find(
        channel =>
          channel.type === ChannelType.GuildCategory &&
          channel.name === categoryName
      );

      if (!category) continue;

      const children = guild.channels.cache.filter(
        channel => channel.parentId === category.id
      );

      for (const channel of children.values()) {
        try {
          await channel.delete("Summer Tier List reset");
          deletedChannels++;
        } catch (error) {
          console.error(
            `No se pudo borrar ${channel.name}:`,
            error
          );
        }
      }

      try {
        await category.delete("Summer Tier List reset");
        deletedCategories++;
      } catch (error) {
        console.error(
          `No se pudo borrar ${category.name}:`,
          error
        );
      }
    }

    for (const name of oldChannels) {
      const channels = guild.channels.cache.filter(
        channel =>
          channel.type === ChannelType.GuildText &&
          channel.name === name
      );

      for (const channel of channels.values()) {
        try {
          await channel.delete("Summer Tier List reset");
          deletedChannels++;
        } catch (error) {
          console.error(
            `No se pudo borrar ${channel.name}:`,
            error
          );
        }
      }
    }

    const config = {
      guildId: "",
      categoryId: "",
      ticketCategoryId: "",
      ticketPanelId: "",

      channels: {
        waitlists: {},
        results: "",
        highResults: "",
        support: "",
        applications: "",
        logs: ""
      },

      roles: {}
    };

    fs.writeFileSync(
      CONFIG_FILE,
      JSON.stringify(config, null, 2),
      "utf8"
    );

    const database = {
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
    };

    fs.writeFileSync(
      DB_FILE,
      JSON.stringify(database, null, 2),
      "utf8"
    );

    await interaction.editReply(
      "🧹 **RESET COMPLETADO**\n\n" +
      `🗑️ Canales eliminados: **${deletedChannels}**\n` +
      `📁 Categorías eliminadas: **${deletedCategories}**\n` +
      "💾 Configuración reiniciada.\n" +
      "🗄️ Base de datos reiniciada.\n\n" +
      "Ahora puedes ejecutar **/setup**."
    );
  }
};
