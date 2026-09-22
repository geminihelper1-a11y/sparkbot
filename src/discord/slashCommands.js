// NETHRION BOT 2.0 - Slash Commands Registration & Dispatcher
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const minecraftService = require('../services/minecraftService');
const linkBridgeService = require('../services/linkBridgeService');
const backupService = require('../services/backupService');
const ticketService = require('../services/ticketService');
const logger = require('../core/logger');

const commands = [
  new SlashCommandBuilder()
    .setName('smp')
    .setDescription('Display real-time NETHRION Minecraft SMP server status.'),

  new SlashCommandBuilder()
    .setName('profile')
    .setDescription('View your linked Minecraft account profile and streaks.')
    .addUserOption(opt => opt.setName('user').setDescription('Target user (defaults to you)')),

  new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Open a private support ticket with server staff.')
    .addStringOption(opt => opt.setName('topic').setDescription('Topic or reason for ticket')),

  new SlashCommandBuilder()
    .setName('backup')
    .setDescription('Generate an archival snapshot and ZIP backup of server structure.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('help')
    .setDescription('View the official NETHRION command and capability directory.')
];

class SlashCommandHandler {
  static getDefinitions() {
    return commands.map(c => c.toJSON());
  }

  static async handleInteraction(interaction) {
    if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;

    try {
      if (commandName === 'smp') {
        await interaction.deferReply();
        const status = await minecraftService.getFullStatus();
        const embed = minecraftService.buildStatusEmbed(status);
        await interaction.editReply({ embeds: [embed] });
      } else if (commandName === 'profile') {
        const targetUser = interaction.options.getUser('user') || interaction.user;
        const profile = linkBridgeService.getProfile(targetUser.id);

        const embed = new EmbedBuilder()
          .setTitle('Player Profile — ' + targetUser.username)
          .setColor(0x3498db)
          .addFields(
            { name: 'Minecraft IGN', value: profile.linked ? '`' + profile.ign + '`' : '*Not linked*', inline: true },
            { name: 'Current Streak', value: '🔥 ' + profile.streak + ' days', inline: true },
            { name: 'Highest Streak', value: '🏆 ' + profile.highestStreak + ' days', inline: true }
          )
          .setFooter({ text: 'NETHRION System' });

        await interaction.reply({ embeds: [embed] });
      } else if (commandName === 'ticket') {
        await interaction.deferReply({ ephemeral: true });
        const topic = interaction.options.getString('topic') || 'General Support';
        const channel = await ticketService.createTicket(interaction.guild, interaction.member, topic);
        await interaction.editReply({ content: 'Ticket created: ' + channel.toString() });
      } else if (commandName === 'backup') {
        await interaction.deferReply({ ephemeral: true });
        const backup = await backupService.createGuildBackup(interaction.guild);
        await interaction.editReply({
          content: 'Server snapshot created successfully: `' + backup.fileName + '` (' + Math.round(backup.sizeBytes / 1024) + ' KB).'
        });
      } else if (commandName === 'help') {
        const embed = new EmbedBuilder()
          .setTitle('NETHRION System Directory')
          .setColor(0x2b2d31)
          .setDescription(
            '**Operating System for Discord & Minecraft SMP**\n\n' +
            '• **/smp** — Live Java & Bedrock server status & player count\n' +
            '• **/profile** — View linked Minecraft profile & message streaks\n' +
            '• **/ticket** — Open a support ticket\n' +
            '• **/backup** — Create a server structure snapshot (Admins)\n\n' +
            '**Natural AI Interface:**\n' +
            'Mention @NETHRION or reply to its messages to manage channels, query statistics, inspect permissions, and interact directly.'
          )
          .setFooter({ text: 'Mindzard Community • NETHRION 2.0' });

        await interaction.reply({ embeds: [embed] });
      }
    } catch (err) {
      logger.error('SLASH_DISPATCH', 'Error in /' + commandName, { error: err.message });
      const errReply = { content: 'An internal error occurred while executing this command.', ephemeral: true };
      if (interaction.deferred) {
        await interaction.editReply(errReply).catch(() => {});
      } else {
        await interaction.reply(errReply).catch(() => {});
      }
    }
  }
}

module.exports = SlashCommandHandler;
