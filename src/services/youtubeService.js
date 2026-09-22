// NETHRION BOT 2.0 - Mindzard YouTube Upload Poller
const https = require('https');
const { EmbedBuilder } = require('discord.js');
const config = require('../core/config');
const database = require('../core/database');
const logger = require('../core/logger');

class YouTubeService {
  constructor() {
    this.pollTimer = null;
    this.client = null;
  }

  setClient(client) {
    this.client = client;
  }

  /**
   * Fetches latest video from channel's public XML RSS feed
   */
  async fetchLatestVideo(channelId) {
    return new Promise((resolve, reject) => {
      const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;

      https.get(url, (res) => {
        if (res.statusCode !== 200) {
          return resolve(null);
        }

        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
          try {
            const entryMatch = data.match(/<entry>[\s\S]*?<\/entry>/);
            if (!entryMatch) return resolve(null);

            const entry = entryMatch[0];
            const idMatch = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/);
            const titleMatch = entry.match(/<title>([^<]+)<\/title>/);
            const authorMatch = entry.match(/<name>([^<]+)<\/name>/);
            const publishedMatch = entry.match(/<published>([^<]+)<\/published>/);

            if (!idMatch) return resolve(null);

            resolve({
              videoId: idMatch[1],
              title: titleMatch ? titleMatch[1] : 'New Video',
              author: authorMatch ? authorMatch[1] : 'Mindzard',
              published: publishedMatch ? publishedMatch[1] : new Date().toISOString(),
              url: `https://www.youtube.com/watch?v=${idMatch[1]}`
            });
          } catch (e) {
            resolve(null);
          }
        });
      }).on('error', (err) => {
        logger.error('YOUTUBE', 'Error fetching feed', { error: err.message });
        resolve(null);
      });
    });
  }

  /**
   * Polls channel and dispatches announcement if a new upload is detected
   */
  async checkUploads() {
    const ytConfig = database.get('ytConfig');
    if (!ytConfig || !ytConfig.channelId || !ytConfig.ytChannelId || !this.client) return null;

    const latest = await this.fetchLatestVideo(ytConfig.ytChannelId);
    if (!latest) return null;

    if (latest.videoId !== ytConfig.lastVideoId) {
      logger.info('YOUTUBE', `New upload detected: ${latest.title} (${latest.videoId})`);

      // Update database first to avoid duplicate announcements
      ytConfig.lastVideoId = latest.videoId;
      database.set('ytConfig', ytConfig);

      // Post announcement
      const channel = await this.client.channels.fetch(ytConfig.channelId).catch(() => null);
      if (channel) {
        const embed = new EmbedBuilder()
          .setTitle(`🎬 New Upload: ${latest.title}`)
          .setURL(latest.url)
          .setColor(0xff0000)
          .setDescription(`**${latest.author}** just uploaded a new video!\n\n[Watch on YouTube](${latest.url})`)
          .setImage(`https://i.ytimg.com/vi/${latest.videoId}/maxresdefault.jpg`)
          .setFooter({ text: 'Mindzard Official YouTube Notifications' })
          .setTimestamp();

        await channel.send({
          content: `📢 **@everyone** Mindzard just posted a new video: ${latest.url}`,
          embeds: [embed]
        }).catch(err => logger.error('YOUTUBE', 'Failed to send announcement', { error: err.message }));
      }

      return latest;
    }

    return null;
  }

  startPoller() {
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.pollTimer = setInterval(() => {
      this.checkUploads().catch(() => {});
    }, config.youtube.pollIntervalMs);
  }
}

const youtubeService = new YouTubeService();
module.exports = youtubeService;
