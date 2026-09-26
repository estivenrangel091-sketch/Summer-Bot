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

```
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

// Borrar categorías y sus canales
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
      console.error(`No se pudo borrar ${channel.name}:`, error);
    }
  }

  try {
    await category.delete("Summer Tier List reset");
    deletedCategories++;
  } catch (error) {
    console.error(`No se pudo borrar ${category.name}:`, error);
  }
}

// Borrar canales antiguos que estén fuera de las categorías
for (const name of oldChannels) {
  const channels =
```
