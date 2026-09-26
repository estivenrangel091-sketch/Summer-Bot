require("dotenv").config();

const fs = require("node:fs");
const path = require("node:path");
const { REST, Routes } = require("discord.js");

const TOKEN = process.env.DISCORD_TOKEN || process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

console.log("TOKEN:", TOKEN ? "OK" : "MISSING");
console.log("CLIENT_ID:", CLIENT_ID ? "OK" : "MISSING");
console.log("GUILD_ID:", GUILD_ID ? "OK" : "MISSING");

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

const commands = [];

for (const file of commandFiles) {
  const filePath = path.join(__dirname, file);

  if (!fs.existsSync(filePath)) {
    console.warn("No se encontro: " + file);
    continue;
  }

  try {
    const command = require(filePath);

    if (command.data) {
      commands.push(command.data.toJSON());
      console.log("Preparado: " + command.data.name);
    }
  } catch (error) {
    console.error("Error cargando " + file);
    console.error(error);
  }
}

if (!TOKEN) {
  console.error("No se encontro DISCORD_TOKEN ni TOKEN.");
  process.exit(1);
}

if (!CLIENT_ID) {
  console.error("No se encontro CLIENT_ID.");
  process.exit(1);
}

if (!GUILD_ID) {
  console.error("No se encontro GUILD_ID.");
  process.exit(1);
}

const rest = new REST({ version: "10" }).setToken(TOKEN);

rest.put(
  Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
  { body: commands }
)
.then(() => {
  console.log("Comandos registrados correctamente.");
})
.catch((error) => {
  console.error("Error registrando comandos:");
  console.error(error);
  process.exit(1);
});
