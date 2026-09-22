// NETHRION BOT 2.0 - Moderation & Anti-Raid Burst Protection
const { EmbedBuilder } = require('discord.js');
const config = require('../core/config');
const logger = require('../core/logger');
const database = require('../core/database');

class ModerationService {
  constructor() {
    this.roleDeleteTimestamps = [];
    this.channelDeleteTimestamps = [];
  }

  /**
   * Tracks role deletion and alerts if burst threshold is exceeded
   */
  async handleRoleDelete(role) {
    const now = Date.now();
    this.roleDeleteTimestamps.push(now);
    this.roleDeleteTimestamps = this.roleDeleteTimestamps.filter(t => now - t <= config.security.raidTimeWindowMs);

    logger.audit('MODERATION', `Role deleted: @${role.name} (${role.id})`);

    if (this.roleDeleteTimestamps.length >= config.security.raidThresholdRoleDeletes) {
      await this.triggerRaidAlert(role.guild, `High rate of role deletions detected (${this.roleDeleteTimestamps.length} in 15 seconds).`);
    }
  }

  /**
   * Tracks channel deletion and alerts if burst threshold is exceeded
   */
  async handleChannelDelete(channel) {
    const now = Date.now();
    this.channelDeleteTimestamps.push(now);
    this.channelDeleteTimestamps = this.channelDeleteTimestamps.filter(t => now - t <= config.security.raidTimeWindowMs);

    logger.audit('MODERATION', `Channel deleted: #${channel.name} (${channel.id})`);

    if (this.channelDeleteTimestamps.length >= config.security.raidThresholdChannelDeletes) {
      await this.triggerRaidAlert(channel.guild, `High rate of channel deletions detected (${this.channelDeleteTimestamps.length} in 15 seconds).`);
    }
  }

  async triggerRaidAlert(guild, reason) {
    logger.warn('ANTI_RAID', `SECURITY TRIGGER in ${guild.name}: ${reason}`);
    const settings = database.get('settings', {});
    if (settings.logChannelId) {
      const logChan = guild.channels.cache.get(settings.logChannelId);
      if (logChan) {
        const alertEmbed = new EmbedBuilder()
          .setTitle('🚨 SECURITY ALERT: Potential Server Raid')
          .setColor(0xe74c3c)
          .setDescription(`**Warning:** ${reason}\n\nReview recent audit logs immediately.`)
          .setTimestamp();
        await logChan.send({ content: '@here', embeds: [alertEmbed] }).catch(() => {});
      }
    }
  }

  /**
   * Evaluates incoming message content for spam or harmful links
   */
  checkMessage(message) {
    if (message.author.bot || !message.guild) return { allowed: true };

    // Mass mentions check (more than 5 mentions)
    if (message.mentions.users.size > 5) {
      return {
        allowed: false,
        reason: 'Mass mention violation (exceeded 5 users)'
      };
    }

    return { allowed: true };
  }
}

const moderationService = new ModerationService();
module.exports = moderationService;
