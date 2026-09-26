const fs = require("node:fs");
const path = require("node:path");

const DB_FILE = path.join(__dirname, "database.json");
const CONFIG_FILE = path.join(__dirname, "config.json");

function read(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function write(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function getDB() {
  return read(DB_FILE, {
    waitlists: {
      netpot: [],
      uhc: [],
      sword: [],
      boxpvp: [],
      crystalpvp: []
    },
    cooldowns: {},
    profiles: {},
    results: [],
    highResults: [],
    applications: [],
    tickets: []
  });
}

function saveDB(db) {
  write(DB_FILE, db);
}

function getConfig() {
  return read(CONFIG_FILE, {
    guildId: "",
    categoryId: "",
    channels: {
      waitlists: {},
      results: "",
      highResults: "",
      support: "",
      applications: "",
      logs: ""
    },
    roles: {}
  });
}

function saveConfig(config) {
  write(CONFIG_FILE, config);
}

const MODES = {
  netpot: {
    name: "NetPot",
    emoji: "🟠"
  },
  uhc: {
    name: "UHC",
    emoji: "🧪"
  },
  sword: {
    name: "Sword",
    emoji: "⚔️"
  },
  boxpvp: {
    name: "BoxPvP",
    emoji: "📦"
  },
  crystalpvp: {
    name: "CrystalPvP",
    emoji: "💎"
  }
};

const TIERS = [
  "HT1",
  "LT1",
  "HT2",
  "LT2",
  "HT3",
  "LT3",
  "HT4",
  "LT4",
  "HT5",
  "LT5"
];

function modeInfo(mode) {
  return MODES[mode] || {
    name: mode,
    emoji: "🎮"
  };
}

module.exports = {
  getDB,
  saveDB,
  getConfig,
  saveConfig,
  MODES,
  TIERS,
  modeInfo
};
