const path = require('path');
// NETHRION BOT 2.0 - Validated Configuration Manager
require('dotenv').config();

const config = {
  // Discord
  discord: {
    token: process.env.DISCORD_TOKEN || '',
    clientId: process.env.DISCORD_CLIENT_ID || '',
    guildId: process.env.GUILD_ID || '',
    prefix: process.env.BOT_PREFIX || '!'
  },

  // AI Providers (Gemini Primary + Groq Fallback)
  ai: {
    geminiKey: process.env.GEMINI_API_KEY || '',
    geminiModel: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
    geminiImageModel: process.env.GEMINI_IMAGE_MODEL || 'imagen-3.0-generate-002',
    groqKey: process.env.GROQ_API_KEY || '',
    groqModel: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
    groqStrongModel: process.env.GROQ_STRONG_MODEL || 'llama-3.3-70b-versatile',
    maxTokens: 1024,
    temperature: 0.3
  },

  // Minecraft SMP
  minecraft: {
    javaHost: process.env.SMP_JAVA_HOST || 'nethrionsmp.pixelforge.gg',
    javaPort: parseInt(process.env.SMP_JAVA_PORT || '25565', 10),
    bedrockHost: process.env.SMP_BEDROCK_HOST || '15.235.165.81',
    bedrockPort: parseInt(process.env.SMP_BEDROCK_PORT || '26091', 10),
    statusIntervalMs: 60 * 1000 // 60s live status update
  },

  // Mindzard YouTube
  youtube: {
    channelId: process.env.YOUTUBE_CHANNEL_ID || 'UCuAxRsd-5yiQRvPMvWnvMAw',
    pollIntervalMs: 5 * 60 * 1000 // 5 minutes
  },

  // DiscordSRV Console / Link Bridge
  discordSrv: {
    consoleChannelId: process.env.DISCORDSRV_CONSOLE_CHANNEL_ID || '',
    linkChannelId: process.env.DISCORDSRV_LINK_CHANNEL_ID || ''
  },

  // System & Security Policies
  security: {
    raidThresholdRoleDeletes: 3,
    raidThresholdChannelDeletes: 3,
    raidTimeWindowMs: 15 * 1000,
    maxPurgeLimit: 100,
    confirmationPurgeThreshold: 20
  },

  // File Paths
  paths: {
    database: path.join(__dirname, '../../data/nethrion_data.json'),
    legacyDatabase: path.join(__dirname, '../../data.json'),
    backupsDir: path.join(__dirname, '../../backups')
  }
};

module.exports = config;
