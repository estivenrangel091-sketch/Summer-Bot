```js
require("dotenv").config();

const fs = require("node:fs");
const path = require("node:path");
const { REST, Routes } = require("discord.js");

// FadeHost usa DISCORD_TOKEN.
// También aceptamos TOKEN por compatibilidad.
const TOKEN = process.env.DISCORD_TOKEN || process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

console.log("🔑 TOKEN:", TOKEN ? "✅ Encontrado" : "❌ NO ENCONTRADO");
console.log("🆔 CLIENT_ID:", CLIENT_ID ? "✅ Encontrado" : "❌ NO ENCONTRADO");
console.log("🏠 GUILD_ID:", GUILD_ID ? "✅ Encontrado" : "❌ NO ENCONTRADO");

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
    console.warn(`⚠️ No se encontró: ${file}`);
    continue;
  }

  try {
    const command = require(filePath);

    if (command.data) {
      commands.push(command.data.toJSON());
      console.log(`✅ Preparado: ${command.data.name}`);
    } else {
      console.warn(`⚠️ ${file} no tiene "data".`);
    }
  } catch (error) {
    console.error(`❌ Error cargando ${file}:`, error);
  }
}

if (!TOKEN) {
  console.error("❌ No se encontró DISCORD_TOKEN ni TOKEN.");
  process.exit(1);
}

if (!CLIENT_ID) {
  console.error("❌ No se encontró CLIENT_ID.");
  process.exit(1);
}

if (!GUILD_ID) {
  console.error("❌ No se encontró GUILD_ID.");
  process.exit(1);
}

(async () => {
  const rest = new REST({ version: "10" }).setToken(TOKEN);

  try {
    console.log(`📋 Registrando ${commands.length} comandos...`);

    await rest.put(
      Routes.applicationGuildCommands(
        CLIENT_ID,
        GUILD_ID
      ),
      {
        body: commands
      }
    );

    console.log("✅ Comandos registrados correctamente.");
  } catch (error) {
    console.error("❌ Error registrando comandos:", error);
    process.exit(1);
  }
})();
```
