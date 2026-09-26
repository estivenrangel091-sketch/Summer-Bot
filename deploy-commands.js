require("dotenv").config();

const fs = require("node:fs");
const path = require("node:path");
const { REST, Routes } = require("discord.js");

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

(async () => {
  const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

  try {
    console.log(`📋 Registrando ${commands.length} comandos...`);

    await rest.put(
      Routes.applicationGuildCommands(
        process.env.CLIENT_ID,
        process.env.GUILD_ID
      ),
      { body: commands }
    );

    console.log("✅ Comandos registrados correctamente.");
  } catch (error) {
    console.error("❌ Error registrando comandos:", error);
  }
})();
