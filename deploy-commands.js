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

```
const command = require(filePath);

if (!command.data) {
  console.log(
    `⚠️ ${file} no contiene command.data`
  );
  continue;
}

const json = command.data.toJSON();

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
```

} catch (error) {
console.error(
`❌ Error cargando ${file}:`
);
console.error(error);
}
}

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

```
console.log(
  "✅ TODOS LOS COMANDOS REGISTRADOS."
);
```

} catch (error) {
console.error(
"❌ Error registrando comandos:"
);
console.error(error);

```
process.exit(1);
```

}
})();

