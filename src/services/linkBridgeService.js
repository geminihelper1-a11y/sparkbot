// NETHRION BOT 2.0 - Minecraft & DiscordSRV Link Bridge Service
const database = require('../core/database');
const logger = require('../core/logger');

class LinkBridgeService {
  /**
   * Links a Discord user to a Minecraft Username / UUID
   */
  linkAccount(discordId, ign, uuid = null) {
    const links = database.get('links', {});
    links[discordId] = {
      ign,
      uuid: uuid || `offline_${ign.toLowerCase()}`,
      linkedAt: new Date().toISOString()
    };
    database.set('links', links);
    logger.audit('LINK_BRIDGE', `Linked ${discordId} to ${ign}`);
    return links[discordId];
  }

  /**
   * Unlinks a Discord user's Minecraft account
   */
  unlinkAccount(discordId) {
    const links = database.get('links', {});
    if (!links[discordId]) return false;
    delete links[discordId];
    database.set('links', links);
    logger.audit('LINK_BRIDGE', `Unlinked ${discordId}`);
    return true;
  }

  /**
   * Retrieves player profile
   */
  getProfile(discordId) {
    const links = database.get('links', {});
    const link = links[discordId] || null;
    const streaks = database.get('streaks', {});
    const streak = streaks[discordId] || { currentStreak: 0, highestStreak: 0 };

    return {
      linked: !!link,
      ign: link ? link.ign : null,
      uuid: link ? link.uuid : null,
      linkedAt: link ? link.linkedAt : null,
      streak: streak.currentStreak,
      highestStreak: streak.highestStreak
    };
  }
}

const linkBridgeService = new LinkBridgeService();
module.exports = linkBridgeService;
