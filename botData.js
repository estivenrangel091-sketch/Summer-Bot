const fs = require("node:fs");
const path = require("node:path");

const DB_FILE = path.join(__dirname, "database.json");
const CONFIG_FILE = path.join(__dirname, "config.json");

const MODES = {
netpot: { name: "NetPot", emoji: "🟠" },
uhc: { name: "UHC", emoji: "🧪" },
sword: { name: "Sword", emoji: "⚔️" },
boxpvp: { name: "BoxPvP", emoji: "📦" },
crystalpvp: { name: "CrystalPvP", emoji: "💎" }
};

const MODE_KEYS = Object.keys(MODES);

const TIERS = [
"HT1", "LT1",
"HT2", "LT2",
"HT3", "LT3",
"HT4", "LT4",
"HT5", "LT5"
];

const COOLDOWN = 3 * 24 * 60 * 60 * 1000;

function readJSON(file, fallback) {
try {
if (!fs.existsSync(file)) return fallback;

```
const data = fs.readFileSync(file, "utf8");

if (!data.trim()) return fallback;

return JSON.parse(data);
```

} catch {
return fallback;
}
}

function writeJSON(file, data) {
fs.writeFileSync(
file,
JSON.stringify(data, null, 2),
"utf8"
);
}

function getDB() {
const db = readJSON(DB_FILE, {});

db.waitlists ??= {};
db.cooldowns ??= {};
db.profiles ??= {};
db.results ??= [];
db.highResults ??= [];
db.applications ??= [];
db.tickets ??= [];

for (const mode of MODE_KEYS) {
db.waitlists[mode] ??= [];
}

return db;
}

function saveDB(db) {
writeJSON(DB_FILE, db);
}

function getConfig() {
const config = readJSON(CONFIG_FILE, {});

config.guildId ??= "";
config.categoryId ??= "";
config.ticketCategoryId ??= "";
config.ticketPanelId ??= "";

config.channels ??= {};
config.channels.waitlists ??= {};
config.channels.results ??= "";
config.channels.highResults ??= "";
config.channels.support ??= "";
config.channels.applications ??= "";
config.channels.logs ??= "";

config.roles ??= {};

return config;
}

function saveConfig(config) {
writeJSON(CONFIG_FILE, config);
}

function modeInfo(mode) {
return MODES[mode] || {
name: mode,
emoji: "🎮"
};
}

function cooldownKey(userId, mode) {
return `${userId}:${mode}`;
}

function setCooldown(
db,
userId,
mode,
duration = COOLDOWN
) {
db.cooldowns ??= {};

db.cooldowns[cooldownKey(userId, mode)] =
Date.now() + duration;

saveDB(db);
}

function getCooldown(db, userId, mode) {
return db.cooldowns?.[
cooldownKey(userId, mode)
] || 0;
}

function removeFromWaitlist(db, userId, mode) {
if (!db.waitlists?.[mode]) return;

db.waitlists[mode] =
db.waitlists[mode].filter(
id => id !== userId
);
}

module.exports = {
MODES,
MODE_KEYS,
TIERS,
COOLDOWN,
modeInfo,
getDB,
saveDB,
getConfig,
saveConfig,
setCooldown,
getCooldown,
removeFromWaitlist
};
