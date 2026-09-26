const {
  SlashCommandBuilder,
  PermissionFlagsBits
} = require("discord.js");

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

module.exports = {
  data: new SlashCommandBuilder()
    .setName("staffsetup")
    .setDescription("Crea todos los rangos de Summer Tier List.")
    .setDefaultMemberPermissions(
      PermissionFlagsBits.Administrator
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const guild = interaction.guild;

    const created = [];
    const existing = [];

    for (const roleData of STAFF_ROLES) {
      const existingRole = guild.roles.cache.find(
        role => role.name === roleData.name
      );

      if (existingRole) {
        existing.push(existingRole.name);
        continue;
      }

      try {
        await guild.roles.create({
          name: roleData.name,
          color: roleData.color,
          hoist: roleData.hoist,
          mentionable: true,
          reason: "Summer Tier List staff roles"
        });

        created.push(roleData.name);
      } catch (error) {
        console.error(
          `Error creando ${roleData.name}:`,
          error
        );
      }
    }

    await interaction.editReply(
      "👥 **STAFF ROLES CONFIGURADOS**\n\n" +
      `✅ Creados: **${created.length}**\n` +
      `♻️ Ya existentes: **${existing.length}**\n\n` +
      "👑 Owner\n" +
      "🛡️ Administrator\n" +
      "🔨 Moderator\n" +
      "💎 Tierlist Manager\n" +
      "🏆 High Tester\n" +
      "🧪 Senior Tester\n" +
      "⚔️ Tester\n" +
      "📋 Trial Tester\n" +
      "🎫 Support\n" +
      "🧑‍💻 Developer\n" +
      "🤝 Partner\n" +
      "📝 Staff Applicant"
    );
  }
};
