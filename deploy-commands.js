require("dotenv").config();

const {
  REST,
  Routes
} = require("discord.js");

const fs = require("node:fs");

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

/* =========================
   LISTA DE COMANDOS
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

/* =========================
   CARGAR COMANDOS
========================= */

const commands = [];
const names = new Set();

for (const file of commandFiles) {
  const filePath = `./${file}`;

  if (!fs.existsSync(filePath)) {
    console.log(`⚠️ No existe: ${file}`);
    continue;
  }

  try {
    delete require.cache[
      require.resolve(filePath)
    ];

    const command = require(filePath);

    if (!command?.data) {
      console.log(
        `⚠️ ${file} no contiene command.data`
      );
      continue;
    }

    const json = command.data.toJSON();

    if (!json.name) {
      console.log(
        `⚠️ ${file} no tiene nombre de comando`
      );
      continue;
    }

    if (names.has(json.name)) {
      console.log(
        `⚠️ DUPLICADO ignorado: /${json.name}`
      );
      continue;
    }

    names.add(json.name);
    commands.push(json);

    console.log(
      `✅ Preparado: /${json.name}`
    );

  } catch (error) {
    console.error(
      `❌ Error cargando ${file}:`
    );

    console.error(error);
  }
}

/* =========================
   RESUMEN
========================= */

console.log("");
console.log(
  `📦 Total: ${commands.length} comandos`
);

console.log(
  commands
    .map(command => `/${command.name}`)
    .join(", ")
);

console.log("");

/* =========================
   REGISTRAR EN DISCORD
========================= */

const rest = new REST({
  version: "10"
}).setToken(TOKEN);

(async () => {
  try {
    console.log("🔄 Registrando comandos en Discord...");

    await rest.put(
      Routes.applicationGuildCommands(
        CLIENT_ID,
        GUILD_ID
      ),
      {
        body: commands
      }
    );

    console.log("");
    console.log(
      "✅ TODOS LOS COMANDOS REGISTRADOS."
    );
    console.log(
      `📦 Discord recibió ${commands.length} comandos.`
    );
    console.log("");

  } catch (error) {
    console.error("");
    console.error(
      "❌ ERROR REGISTRANDO COMANDOS:"
    );
    console.error(error);
    console.error("");

    process.exit(1);
  }
})();
