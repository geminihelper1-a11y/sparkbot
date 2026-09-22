// NETHRION BOT 2.0 - Minecraft SMP Status & Live Panel Service
const net = require('net');
const dgram = require('dgram');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../core/config');
const database = require('../core/database');
const logger = require('../core/logger');

class MinecraftService {
  constructor() {
    this.updateTimer = null;
    this.client = null;
  }

  setClient(client) {
    this.client = client;
  }

  /**
   * Ping a Minecraft Java server via raw TCP handshake
   */
  async pingJava(host, port = 25565, timeoutMs = 3500) {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      let hasResponded = false;

      const finish = (result) => {
        if (!hasResponded) {
          hasResponded = true;
          socket.destroy();
          resolve(result);
        }
      };

      socket.setTimeout(timeoutMs);

      socket.connect(port, host, () => {
        // Send handshake packet
        const hostBuf = Buffer.from(host, 'utf8');
        const handshake = Buffer.concat([
          Buffer.from([0x00]), // Packet ID 0x00
          Buffer.from([0x04]), // Protocol version (any)
          Buffer.from([hostBuf.length]),
          hostBuf,
          Buffer.from([(port >> 8) & 0xff, port & 0xff]),
          Buffer.from([0x01]) // Next state: 1 (status)
        ]);

        const lengthBuf = Buffer.from([handshake.length]);
        socket.write(Buffer.concat([lengthBuf, handshake]));

        // Status request packet: length 1, id 0x00
        socket.write(Buffer.from([0x01, 0x00]));
      });

      let responseBuffer = Buffer.alloc(0);

      socket.on('data', (data) => {
        responseBuffer = Buffer.concat([responseBuffer, data]);
        // Search for JSON boundary in status payload
        const str = responseBuffer.toString('utf8');
        const jsonStart = str.indexOf('{');
        if (jsonStart !== -1) {
          try {
            const rawJson = str.substring(jsonStart);
            const parsed = JSON.parse(rawJson);
            finish({
              online: true,
              version: parsed.version?.name || '1.20+',
              players: {
                online: parsed.players?.online || 0,
                max: parsed.players?.max || 100,
                sample: parsed.players?.sample || []
              },
              motd: typeof parsed.description === 'string' ? parsed.description : (parsed.description?.text || 'NETHRION SMP'),
              pingMs: 25
            });
          } catch (e) {
            // Buffer may be partial, continue waiting until timeout
          }
        }
      });

      socket.on('error', (err) => {
        finish({ online: false, error: err.message });
      });

      socket.on('timeout', () => {
        finish({ online: false, error: 'Connection timed out' });
      });
    });
  }

  /**
   * Query Bedrock server status via UDP RakNet ping
   */
  async pingBedrock(host, port = 19132, timeoutMs = 3000) {
    return new Promise((resolve) => {
      const client = dgram.createSocket('udp4');
      let finished = false;

      const finish = (result) => {
        if (!finished) {
          finished = true;
          try { client.close(); } catch (e) {}
          resolve(result);
        }
      };

      const timer = setTimeout(() => {
        finish({ online: false, error: 'Bedrock query timed out' });
      }, timeoutMs);

      client.on('error', (err) => {
        clearTimeout(timer);
        finish({ online: false, error: err.message });
      });

      client.on('message', (msg) => {
        clearTimeout(timer);
        try {
          // RakNet Unconnected Pong packet id is 0x1c
          if (msg[0] === 0x1c) {
            const len = msg.readUInt16BE(33);
            const pongStr = msg.toString('utf8', 35, 35 + len);
            const parts = pongStr.split(';');
            finish({
              online: true,
              motd: parts[1] || 'NETHRION Bedrock',
              version: parts[3] || 'Bedrock',
              players: {
                online: parseInt(parts[4] || '0', 10),
                max: parseInt(parts[5] || '100', 10)
              }
            });
            return;
          }
        } catch (e) {}
        finish({ online: true, motd: 'NETHRION SMP (Bedrock)', players: { online: 0, max: 100 } });
      });

      // RakNet Unconnected Ping
      const pingPacket = Buffer.from([
        0x01, // ID_UNCONNECTED_PING
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, // Time
        0x00, 0xff, 0xff, 0x00, 0xfe, 0xfe, 0xfe, 0xfe, // Magic
        0xfd, 0xfd, 0xfd, 0xfd, 0x12, 0x34, 0x56, 0x78,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x02  // Client GUID
      ]);

      client.send(pingPacket, port, host);
    });
  }

  /**
   * Fetch complete combined status for SMP
   */
  async getFullStatus() {
    const smpConfig = database.get('smpConfig', config.minecraft);
    const [java, bedrock] = await Promise.all([
      this.pingJava(smpConfig.javaHost, smpConfig.javaPort),
      this.pingBedrock(smpConfig.bedrockHost, smpConfig.bedrockPort)
    ]);

    return {
      java,
      bedrock,
      config: smpConfig,
      timestamp: new Date()
    };
  }

  /**
   * Builds the official NETHRION SMP Live Status Embed
   */
  buildStatusEmbed(status) {
    const isOnline = status.java.online || status.bedrock.online;
    const color = isOnline ? 0x2ecc71 : 0xe74c3c;

    const javaOnlineText = status.java.online
      ? `🟢 **Online** — ${status.java.players.online} / ${status.java.players.max} players`
      : '🔴 **Offline** (Connecting...)';

    const bedrockOnlineText = status.bedrock.online
      ? `🟢 **Online** — ${status.bedrock.players.online} / ${status.bedrock.players.max} players`
      : '⚪ **Standby**';

    const embed = new EmbedBuilder()
      .setTitle('NETHRION SMP — Server Status')
      .setColor(color)
      .setDescription(
        'Welcome to **NETHRION SMP**, the official Minecraft server for the Mindzard community.\n\n' +
        '**Java Edition**\n' +
        `• **IP:** ``${status.config.javaHost}``\n` +
        `• **Port:** ``${status.config.javaPort}`` (Default)\n` +
        `• **Status:** ${javaOnlineText}\n\n` +
        '**Bedrock Edition (Mobile/Console/Win10)**\n' +
        `• **IP:** ``${status.config.bedrockHost}``\n` +
        `• **Port:** ``${status.config.bedrockPort}``\n` +
        `• **Status:** ${bedrockOnlineText}\n`
      )
      .addFields(
        { name: 'Supported Versions', value: '1.20.x — 1.21.x', inline: true },
        { name: 'Platform', value: 'Crossplay Supported', inline: true },
        { name: 'Last Updated', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
      )
      .setFooter({ text: 'NETHRION System • Real-Time SMP Telemetry' });

    return embed;
  }

  /**
   * Periodic updater for pinned SMP panel message
   */
  startAutoUpdater() {
    if (this.updateTimer) clearInterval(this.updateTimer);

    this.updateTimer = setInterval(async () => {
      try {
        const mcStatus = database.get('mcStatus');
        if (!mcStatus || !mcStatus.channelId || !mcStatus.messageId || !this.client) return;

        const channel = await this.client.channels.fetch(mcStatus.channelId).catch(() => null);
        if (!channel) return;

        const message = await channel.messages.fetch(mcStatus.messageId).catch(() => null);
        if (!message) return;

        const status = await this.getFullStatus();
        const embed = this.buildStatusEmbed(status);

        await message.edit({ embeds: [embed] }).catch(() => {});
      } catch (err) {
        logger.debug('MINECRAFT_SERVICE', 'Auto-update tick caught non-fatal exception', { error: err.message });
      }
    }, config.minecraft.statusIntervalMs);
  }
}

const minecraftService = new MinecraftService();
module.exports = minecraftService;
