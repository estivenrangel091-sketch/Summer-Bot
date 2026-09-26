require("dotenv").config();

const {
  REST,
  Routes
} = require("discord.js");

const {
  Collection
} = require("discord.js");

const fs = require("node:fs");

const TOKEN =
  process.env.DISCORD_TOKEN ||
  process.env.TOKEN;

const CLIENT_ID =
  process.env.CLIENT_ID;

const GUILD_ID =
  process.env.GUILD_ID;

console.log(`TOKEN: ${TOKEN ? "OK" : "MISSING"}`);
console.log(`CLIENT_ID: ${CLIENT_ID ? "OK" : "MISSING"}`);
console.log(`GUILD_ID: ${GUILD_ID ? "OK" : "MISSING"}`);

if (!TOKEN || !CLIENT_ID || !GUILD_ID) {
  console.error("❌ Faltan variables de entorno.");
  process.exit(1);
}

/*
 * SOLO estos archivos.
 * No apply.js.
 */
const commandFiles = [
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
const commandNames = new Set();

for (const file of commandFiles) {

  if (!fs.existsSync(`./${file}`)) {
    console.log(`⚠️ No existe: ${file}`);
    continue;
  }

  try {

    delete require.cache[
      require.resolve(`./${file}`)
    ];

    const command = require(`./${file}`);

    if (!command.data) {
      console.log(`⚠️ ${file} no tiene data.`);
      continue;
    }

    const json = command.data.toJSON();

    if (commandNames.has(json.name)) {
      console.log(
        `⚠️ Comando duplicado ignorado: /${json.name} (${file})`
      );
      continue;
    }

    commandNames.add(json.name);
    commands.push(json);

    console.log(`Preparado: ${json.name}`);

  } catch (error) {

    console.error(`❌ Error cargando ${file}`);
    console.error(error);
  }
}

console.log(
  `📦 Registrando ${commands.length} comandos: ${commands
    .map(c => `/${c.name}`)
    .join(", ")}`
);

const rest = new REST({
  version: "10"
}).setToken(TOKEN);

(async () => {

  try {

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

    console.error("❌ Error registrando comandos:");
    console.error(error);

    process.exit(1);
  }

})();
