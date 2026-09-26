const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("apply")
    .setDescription("Solicita un puesto.")
    .addStringOption(o => o.setName("type").setDescription("Tipo de aplicación").setRequired(true)
      .addChoices(
        {name:"Tester",value:"tester"},
        {name:"High Tester",value:"hightester"},
        {name:"Staff",value:"staff"}
      )),
  async execute(interaction) {
    const type = interaction.options.getString("type");
    const { showApplicationModal } = require("../index");
    await showApplicationModal(interaction, type);
  }
};
