require("dotenv").config();
const fs = require("node:fs");
const path = require("node:path");
const { REST, Routes } = require("discord.js");

const commands = [];
for (const file of fs.readdirSync(path.join(__dirname, "commands")).filter(f => f.endsWith(".js"))) {
  const command = require(path.join(__dirname, "commands", file));
  if (command.data) commands.push(command.data.toJSON());
}

(async () => {
  const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);
  try {
    console.log(`Registrando ${commands.length} comandos...`);
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );
    console.log("Comandos registrados.");
  } catch (e) {
    console.error(e);
  }
})();
