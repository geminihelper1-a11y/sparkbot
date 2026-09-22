// NETHRION BOT 2.0 - Unified Event Router
const config = require('../core/config');
const logger = require('../core/logger');
const streakService = require('../services/streakService');
const moderationService = require('../services/moderationService');
const ticketService = require('../services/ticketService');
const aiRouter = require('../ai/aiRouter');
const SlashCommandHandler = require('./slashCommands');

class EventRouter {
  static registerEvents(client) {
    // 1. messageCreate
    client.on('messageCreate', async (message) => {
      if (message.author.bot || !message.guild) return;

      // Antispam / security check
      const modCheck = moderationService.checkMessage(message);
      if (!modCheck.allowed) {
        await message.delete().catch(() => {});
        const warn = await message.channel.send(`${message.author} Action blocked: ${modCheck.reason}`);
        setTimeout(() => warn.delete().catch(() => {}), 4000);
        return;
      }

      // Record community streak activity
      streakService.recordActivity(message.author.id);

      // AI Mention or Reply trigger
      const isMentioned = message.mentions.has(client.user.id) && !message.mentions.everyone;
      const isDirectReply = message.reference && message.channel.messages.cache.get(message.reference.messageId)?.author.id === client.user.id;

      if (isMentioned || isDirectReply) {
        // Send typing indicator
        message.channel.sendTyping().catch(() => {});

        // Clean user input text
        const cleanContent = message.content.replace(new RegExp(`<@!?${client.user.id}>`, 'g'), '').trim();

        const result = await aiRouter.handleChat({
          message: { content: cleanContent || 'Hello' },
          guild: message.guild,
          callerMember: message.member,
          channel: message.channel
        });

        if (result.reply) {
          await message.reply({ content: result.reply }).catch(err => {
            logger.error('EVENT_ROUTER', 'Failed to send AI response', { error: err.message });
          });
        }
      }
    });

    // 2. interactionCreate (Slash commands & buttons)
    client.on('interactionCreate', async (interaction) => {
      if (interaction.isChatInputCommand()) {
        await SlashCommandHandler.handleInteraction(interaction);
      } else if (interaction.isButton()) {
        if (interaction.customId === 'btn_close_ticket') {
          await interaction.reply({ content: 'Closing ticket...', ephemeral: true });
          await ticketService.closeTicket(interaction.channel, interaction.member);
        } else if (interaction.customId === 'btn_claim_ticket') {
          await interaction.reply({ content: `Ticket claimed by ${interaction.member}.` });
        }
      }
    });

    // 3. Security audit triggers (Anti-raid monitoring)
    client.on('roleDelete', async (role) => {
      await moderationService.handleRoleDelete(role);
    });

    client.on('channelDelete', async (channel) => {
      if (channel.guild) {
        await moderationService.handleChannelDelete(channel);
      }
    });

    logger.info('EVENT_ROUTER', 'Single-source Discord event listeners registered.');
  }
}

module.exports = EventRouter;
