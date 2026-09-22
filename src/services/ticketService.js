// NETHRION BOT 2.0 - Support Ticket Service
const { ChannelType, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const database = require('../core/database');
const logger = require('../core/logger');

class TicketService {
  /**
   * Creates or opens a private ticket channel for a member
   */
  async createTicket(guild, member, topic = 'General Support') {
    const ticketConfig = database.get('ticketConfig', {});
    const parentCategory = ticketConfig.categoryChannelId || null;

    const channelName = `ticket-${member.user.username.toLowerCase().replace(/[^a-z0-9]/g, '')}`.slice(0, 30);

    const channel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      parent: parentCategory,
      permissionOverwrites: [
        {
          id: guild.roles.everyone.id,
          deny: [PermissionFlagsBits.ViewChannel]
        },
        {
          id: member.id,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
        },
        {
          id: guild.members.me.id,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ReadMessageHistory]
        }
      ]
    });

    const embed = new EmbedBuilder()
      .setTitle('NETHRION Support Ticket')
      .setColor(0x3498db)
      .setDescription(
        `Hello ${member}, thank you for contacting support.\n\n` +
        `**Topic:** ${topic}\n\n` +
        'Staff has been notified. Please describe your question or issue in detail below.'
      )
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('btn_close_ticket')
        .setLabel('Close Ticket')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('btn_claim_ticket')
        .setLabel('Claim Ticket')
        .setStyle(ButtonStyle.Secondary)
    );

    await channel.send({ content: `${member}`, embeds: [embed], components: [row] });
    logger.audit('TICKETS', `Created ticket channel #${channel.name} for ${member.user.tag}`);

    return channel;
  }

  /**
   * Closes ticket with confirmation
   */
  async closeTicket(channel, closedByMember) {
    await channel.send(`Ticket closed by ${closedByMember}. Deleting channel in 5 seconds...`);
    setTimeout(async () => {
      await channel.delete().catch(() => {});
    }, 5000);
  }
}

const ticketService = new TicketService();
module.exports = ticketService;
