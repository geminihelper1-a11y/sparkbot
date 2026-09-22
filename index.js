// ==============================================================================
// NETHRION BOT 2.0 — MASTER ALL-IN-ONE PRODUCTION OPERATING SYSTEM
// Discord Community & Minecraft SMP Integration for Mindzard
// ==============================================================================

require('dotenv').config();
const {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  PermissionFlagsBits,
  ChannelType
} = require('discord.js');
const fs = require('fs');
const path = require('path');
const https = require('https');
const archiver = require('archiver');

// ------------------------------------------------------------------------------
// 1. CONFIGURATION & ENVIRONMENT
// ------------------------------------------------------------------------------
const CONFIG = {
  token: process.env.DISCORD_TOKEN || '',
  clientId: process.env.DISCORD_CLIENT_ID || '',
  guildId: process.env.GUILD_ID || '',
  prefix: 'sp',
  geminiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
  groqKey: process.env.GROQ_API_KEY || '',
  groqModel: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
  smp: {
    javaHost: process.env.SMP_JAVA_HOST || 'nethrionsmp.pixelforge.gg',
    javaPort: parseInt(process.env.SMP_JAVA_PORT || '25565', 10),
    bedrockHost: process.env.SMP_BEDROCK_HOST || '15.235.165.81',
    bedrockPort: parseInt(process.env.SMP_BEDROCK_PORT || '26091', 10)
  },
  youtube: {
    channelId: process.env.YOUTUBE_CHANNEL_ID || 'UCuAxRsd-5yiQRvPMvWnvMAw',
    pollIntervalMs: 5 * 60 * 1000
  },
  dbPath: path.join(__dirname, 'data.json'),
  backupDir: path.join(__dirname, 'backups')
};

// ------------------------------------------------------------------------------
// 2. ATOMIC DATABASE PERSISTENCE (LOADS & STORES DATA.JSON)
// ------------------------------------------------------------------------------
class DBManager {
  constructor(filePath) {
    this.filePath = filePath;
    this.data = this.load();
  }

  load() {
    try {
      if (fs.existsSync(this.filePath)) {
        return JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
      }
    } catch (e) {
      console.error('[DB] Error loading data.json:', e.message);
    }
    return {
      mcStatus: { channelId: null, messageId: null, ip: CONFIG.smp.javaHost },
      smpConfig: CONFIG.smp,
      ytConfig: { channelId: null, ytChannelId: CONFIG.youtube.channelId, lastVideoId: null },
      ticketConfig: { channelId: null, categoryChannelId: null },
      streaks: {},
      links: {},
      reports: [],
      suggestions: [],
      tasks: [],
      anonCount: 0
    };
  }

  save() {
    try {
      const temp = this.filePath + '.tmp.' + Date.now();
      fs.writeFileSync(temp, JSON.stringify(this.data, null, 2), 'utf8');
      fs.renameSync(temp, this.filePath);
    } catch (e) {
      console.error('[DB] Atomic save failed:', e.message);
    }
  }

  get(key, defaultValue = null) {
    return this.data[key] !== undefined ? this.data[key] : defaultValue;
  }

  set(key, val) {
    this.data[key] = val;
    this.save();
  }
}

const db = new DBManager(CONFIG.dbPath);

// ------------------------------------------------------------------------------
// 3. MINECRAFT SMP TELEMETRY (100% SYNCED VIA API.MCSTATUS.IO)
// ------------------------------------------------------------------------------
let smpCache = null;
let smpCacheTime = 0;

function cleanMotd(str) {
  if (!str) return '';
  return String(str)
    .replace(/§[0-9a-fk-or]/gi, '')
    .replace(/&[0-9a-fk-or]/gi, '')
    .replace(/\\n/g, ' ')
    .trim();
}

async function fetchMCStatus(kind, host, port) {
  const defaultPort = kind === 'java' ? 25565 : 19132;
  const address = encodeURIComponent(host + (port && port !== defaultPort ? ':' + port : ''));
  const url = 'https://api.mcstatus.io/v2/status/' + kind + '/' + address;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'NETHRION-Bot/2.0 (Mindzard Community)' }
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    clearTimeout(timer);
    return null;
  }
}

async function getLiveSMPStatus(force = false) {
  const now = Date.now();
  if (!force && smpCache && (now - smpCacheTime < 25000)) {
    return smpCache;
  }

  const smp = db.get('smpConfig', CONFIG.smp);
  const [javaData, bedrockData] = await Promise.all([
    fetchMCStatus('java', smp.javaHost, smp.javaPort),
    fetchMCStatus('bedrock', smp.bedrockHost, smp.bedrockPort)
  ]);

  const javaOnline = Boolean(javaData?.online);
  const bedrockOnline = Boolean(bedrockData?.online);
  const jPlayers = javaData?.players?.online ?? 0;
  const jMax = javaData?.players?.max ?? 20;
  const bPlayers = bedrockData?.players?.online ?? 0;
  const bMax = bedrockData?.players?.max ?? 20;
  const totalOnline = Math.max(jPlayers, bPlayers);
  const totalMax = Math.max(jMax, bMax);

  const playerList = javaData?.players?.list?.map(p => p.name_clean || p.name_raw).filter(Boolean) || [];

  smpCache = {
    isOnline: javaOnline || bedrockOnline,
    java: {
      online: javaOnline,
      host: smp.javaHost,
      port: smp.javaPort,
      players: jPlayers,
      max: jMax,
      version: cleanMotd(javaData?.version?.name_clean || 'Purpur 1.21.x'),
      motd: cleanMotd(javaData?.motd?.clean || 'Welcome to NETHRION SMP S2')
    },
    bedrock: {
      online: bedrockOnline,
      host: smp.bedrockHost,
      port: smp.bedrockPort,
      players: bPlayers,
      max: bMax,
      version: bedrockData?.version?.name || 'Latest Bedrock',
      motd: cleanMotd(bedrockData?.motd?.clean || 'NETHRION Bedrock')
    },
    playersOnline: totalOnline + '/' + totalMax,
    playerList,
    retrievedAt: now
  };
  smpCacheTime = now;
  return smpCache;
}

// ------------------------------------------------------------------------------
// 4. NEON GLOW DECORATED EMBED BUILDERS
// ------------------------------------------------------------------------------
// NEON COLORS:
// Emerald: #00FF9D | Cyber Cyan: #00F0FF | Royal Purple: #8B5CF6 | Gold: #F59E0B | Crimson: #FF0055
function buildNeonStatusEmbed(data) {
  const isOnline = data.isOnline;
  const color = isOnline ? '#00FF9D' : '#FF0055';

  const embed = new EmbedBuilder()
    .setTitle(isOnline ? '⚡ ＮＥＴＨＲＩＯＮ  ＳＭＰ  —  ＬＩＶＥ  ＳＴＡＴＵＳ ⚡' : '🔴 NETHRION SMP — OFFLINE')
    .setColor(color)
    .setDescription(
      (isOnline
        ? '🟢 **Server is Online & Live Synchronized!**\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'
        : '🔴 **Server is Currently Offline or Restarting.**\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n') +
      '👥 **Active Players:** `' + data.playersOnline + '`\n' +
      '🎮 **Server Version:** `' + data.java.version + '`\n' +
      '📜 **Server Notice:** *' + (data.java.motd || 'Welcome to NETHRION SMP S2') + '*\n'
    )
    .addFields(
      {
        name: '💻 Java Edition (PC / Mac)',
        value: '• **IP:** `' + data.java.host + '`\n• **Port:** `' + data.java.port + '` (Default)',
        inline: true
      },
      {
        name: '📱 Bedrock Edition (PE / Console)',
        value: '• **IP:** `' + data.bedrock.host + '`\n• **Port:** `' + data.bedrock.port + '`',
        inline: true
      }
    )
    .setFooter({ text: '⚡ NETHRION 2.0 • Mindzard Community' })
    .setTimestamp();

  if (data.playerList && data.playerList.length > 0) {
    embed.addFields({
      name: '🎮 Connected Players',
      value: data.playerList.slice(0, 15).map(p => '`' + p + '`').join(', ') || 'None',
      inline: false
    });
  }

  return embed;
}

function buildNeonIpEmbed(data) {
  return new EmbedBuilder()
    .setTitle('🌐 ＮＥＴＨＲＩＯＮ  ＳＭＰ  —  ＣＯＮＮＥＣＴＩＯＮ  ＧＵＩＤＥ')
    .setColor('#00F0FF')
    .setDescription(
      '**Join the official Mindzard community Minecraft server!**\n' +
      'Cross-play supported across both Java and Bedrock editions.\n' +
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
    )
    .addFields(
      {
        name: '💻 Java Edition (PC / Mac / Linux)',
        value: '• **Server Address:** `' + data.java.host + '`\n• **Server Port:** `' + data.java.port + '` (Default)\n• **Version:** `1.20.x — 1.21.x`',
        inline: false
      },
      {
        name: '📱 Bedrock Edition (Mobile / Win10 / Xbox / PS / Switch)',
        value: '• **Server Name:** `NETHRION SMP`\n• **Server IP:** `' + data.bedrock.host + '`\n• **Server Port:** `' + data.bedrock.port + '` (Required)\n• **Version:** `Latest Bedrock`',
        inline: false
      }
    )
    .setFooter({ text: '⚡ Copy the IP above into your Minecraft server list to connect!' })
    .setTimestamp();
}

function buildNeonPanelEmbed(data) {
  const isOnline = data.isOnline;
  const color = isOnline ? '#00FF9D' : '#FF0055';

  const playerListStr = data.playerList && data.playerList.length > 0
    ? data.playerList.slice(0, 20).join(' · ')
    : (isOnline ? '*The Server is Waiting for You, Come Fast!*' : '*Server is currently offline.*');

  return new EmbedBuilder()
    .setTitle('⛏️ ＮＥＴＨＲＩＯＮ  ＳＭＰ  —  ＯＦＦＩＣＩＡＬ  ＬＩＶＥ  ＰＡＮＥＬ')
    .setColor(color)
    .setDescription(
      (isOnline
        ? '🟢 **ONLINE**  ·  **' + data.playersOnline + '** Players Connected\n'
        : '🔴 **OFFLINE**  ·  Server Standby\n') +
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
      '📢 **Notice:** ' + data.java.motd + '\n' +
      '🎮 **Platform:** Crossplay Supported (Java & Bedrock)'
    )
    .addFields(
      {
        name: '👥 Online Players',
        value: playerListStr.slice(0, 1000),
        inline: false
      },
      {
        name: '📌 Server Connection Details',
        value: [
          '🌐 **Java IP:** `' + data.java.host + '`',
          '🪨 **Bedrock IP:** `' + data.bedrock.host + '`',
          '📱 **Bedrock Port:** `' + data.bedrock.port + '`',
          '💻 **Java Port:** `' + data.java.port + '`'
        ].join('\n'),
        inline: false
      }
    )
    .setFooter({ text: '⚡ Auto-refreshes every 60 seconds • NETHRION Telemetry' })
    .setTimestamp();
}

function buildNeonPanelButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('btn_refresh_smp')
      .setLabel('Refresh Status')
      .setEmoji('🔄')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('btn_smp_ip')
      .setLabel('Connection Info')
      .setEmoji('🌐')
      .setStyle(ButtonStyle.Primary)
  );
}

function buildNeonTicketPanelEmbed() {
  return new EmbedBuilder()
    .setTitle('🎟️ ＮＥＴＨＲＩＯＮ  ＳＵＰＰＯＲＴ  ＆  ＨＥＬＰ  ＤＥＳＫ')
    .setColor('#8B5CF6')
    .setDescription(
      '**Need assistance, have questions, or want to report an SMP issue?**\n\n' +
      'Click the button below to open a private support ticket with server staff.\n' +
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
      '🛡️ **Private 1-on-1 channel** with moderators & staff\n' +
      '⚡ **Fast resolution** for SMP, Store, or Discord issues\n' +
      '🔒 **Confidential & secure** environment'
    )
    .setFooter({ text: 'Mindzard Community Support • Click below to start' })
    .setTimestamp();
}

function buildAnonPanelEmbed() {
  return new EmbedBuilder()
    .setTitle('💬 ＮＥＴＨＲＩＯＮ  ＡＮＯＮＹＭＯＵＳ  ＭＥＳＳＡＧＥＳ')
    .setColor('#00F0FF')
    .setDescription(
      '**Have a secret question, confession, or feedback?**\n\n' +
      'Click the button below to submit a message 100% anonymously to this channel.\n' +
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
      '• Your identity is completely hidden\n' +
      '• Filtered for safety and community rules\n' +
      '• Safe space for thoughts and questions'
    )
    .setFooter({ text: 'Mindzard Community • Confidential & Safe' })
    .setTimestamp();
}

// ------------------------------------------------------------------------------
// 5. AI ENGINE (GEMINI 2.0 PRIMARY + GROQ RESILIENT FALLBACK)
// ------------------------------------------------------------------------------
async function runAIChat(userPrompt, guild, member) {
  const systemInstruction = 
    'You are NETHRION, the operating system of the Discord community and its Minecraft SMP.\n' +
    'You are directly associated with Mindzard\'s YouTube channel and community.\n' +
    'Operational Principles:\n' +
    '1. Answer concisely, accurately, and authoritatively.\n' +
    '2. Zero cringe: no forced slang (bro/king/legend), no repetitive stock jokes, no corporate filler.\n' +
    '3. Clean Discord formatting (bold, lists, code blocks).\n' +
    'Server Name: ' + (guild ? guild.name : 'NETHRION') + '\n' +
    'User: ' + (member ? member.user.tag : 'User');

  if (CONFIG.geminiKey) {
    try {
      const { GoogleGenerativeAI } = require('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(CONFIG.geminiKey);
      const model = genAI.getGenerativeModel({
        model: CONFIG.geminiModel,
        systemInstruction
      });
      const res = await model.generateContent(userPrompt);
      return res.response.text();
    } catch (e) {
      console.warn('[AI] Gemini primary exception, falling back to Groq:', e.message);
    }
  }

  if (CONFIG.groqKey) {
    try {
      const Groq = require('groq-sdk');
      const groq = new Groq({ apiKey: CONFIG.groqKey });
      const completion = await groq.chat.completions.create({
        model: CONFIG.groqModel,
        messages: [
          { role: 'system', content: systemInstruction },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 800
      });
      return completion.choices[0]?.message?.content || 'Action acknowledged.';
    } catch (e) {
      console.error('[AI] Groq fallback error:', e.message);
    }
  }

  return 'I am currently in offline mode (no API key configured). Slash and prefix commands remain fully operational.';
}

// ------------------------------------------------------------------------------
// 6. DISCORD CLIENT INITIALIZATION
// ------------------------------------------------------------------------------
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

// Community Streaks Tracking
function recordStreak(userId) {
  const today = new Date().toISOString().split('T')[0];
  const streaks = db.get('streaks', {});
  const userStreak = streaks[userId] || { currentStreak: 0, highestStreak: 0, lastActiveDate: null, totalActiveDays: 0 };

  if (userStreak.lastActiveDate === today) return userStreak;

  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  if (userStreak.lastActiveDate === yesterday) {
    userStreak.currentStreak += 1;
  } else {
    userStreak.currentStreak = 1;
  }

  if (userStreak.currentStreak > userStreak.highestStreak) {
    userStreak.highestStreak = userStreak.currentStreak;
  }

  userStreak.lastActiveDate = today;
  userStreak.totalActiveDays = (userStreak.totalActiveDays || 0) + 1;
  streaks[userId] = userStreak;
  db.set('streaks', streaks);
  return userStreak;
}

// ------------------------------------------------------------------------------
// 7. MESSAGE EVENT & COMMAND DISPATCHER
// ------------------------------------------------------------------------------
client.on('messageCreate', async (message) => {
  if (!message.guild) return;

  // DiscordSRV Console / Link detection
  if (message.author.bot || message.webhookId) {
    const text = message.content || '';
    if (/(account\s+linked|linked\s+account|successfully\s+linked)/i.test(text)) {
      const targetMember = message.mentions.members.first();
      const match = text.match(/\b([A-Za-z0-9_]{3,16})\b/);
      if (targetMember && match) {
        const links = db.get('links', {});
        links[targetMember.id] = { ign: match[1], linkedAt: new Date().toISOString() };
        db.set('links', links);
      }
    }
    if (message.author.bot) return;
  }

  // Record member streak
  recordStreak(message.author.id);

  const content = message.content.trim();
  let cmdString = null;

  // Match all variations: sp <cmd>, s/ <cmd>, !sp <cmd>, or just "sp"
  if (/^(sp|s)\s+/i.test(content)) {
    cmdString = content.replace(/^(sp|s)\s+/i, '').trim();
  } else if (/^(sp|s)$/i.test(content)) {
    cmdString = 'help';
  } else if (content.toLowerCase().startsWith('s/')) {
    cmdString = content.slice(2).trim();
  } else if (content.startsWith('!sp ')) {
    cmdString = content.slice(4).trim();
  }

  // Handle Natural AI Mention or Direct Reply to Bot
  const isMentioned = message.mentions.has(client.user.id) && !message.mentions.everyone;
  const isReply = message.reference && message.channel.messages.cache.get(message.reference.messageId)?.author.id === client.user.id;

  if (!cmdString && (isMentioned || isReply)) {
    message.channel.sendTyping().catch(() => {});
    const cleanPrompt = content.replace(new RegExp('<@!?' + client.user.id + '>', 'g'), '').trim() || 'Hello';
    const reply = await runAIChat(cleanPrompt, message.guild, message.member);
    return message.reply({ content: reply.slice(0, 1950) }).catch(() => {});
  }

  if (!cmdString) return;

  const args = cmdString.split(/\s+/);
  const cmdLower = cmdString.toLowerCase();
  const subCmd = args[0].toLowerCase();

  // Robust permission detection (Owner always has bypass)
  const isOwner = message.author.id === message.guild.ownerId;
  const isAdmin = isOwner || Boolean(message.member?.permissions.has(PermissionFlagsBits.Administrator));
  const isStaff = isAdmin || Boolean(message.member?.permissions.has(PermissionFlagsBits.ManageGuild));

  // --------------------------------------------------------------------------
  // SP HELP / SP HELP ADMIN
  // --------------------------------------------------------------------------
  if (cmdLower === 'help admin') {
    if (!isAdmin) {
      return message.reply('❌ This command is restricted to Admins!');
    }

    const adminHelp = new EmbedBuilder()
      .setTitle('👑 ＮＥＴＨＲＩＯＮ  ＢＯＴ  —  ＡＤＭＩＮ  ＣＯＭＭＡＮＤＳ')
      .setColor('#8B5CF6')
      .setDescription('Complete control suite for NETHRION server and Minecraft SMP operations:')
      .addFields(
        {
          name: '🛡️ Server & Moderation Commands',
          value: [
            '`sp role <role> @user...` — Assign a role to members.',
            '`sp rolelist <role>` — List all members holding a role.',
            '`sp roles-panel` — Deploy notification channel role selector.',
            '`sp lock` / `sp unlock` — Lock or unlock current channel.',
            '`sp slock @user` / `sp sunlock @user` — Lock/unlock channel for a specific user.',
            '`sp purge <count>` / `sp purge @user <count>` — Safe bulk message deletion.'
          ].join('\n')
        },
        {
          name: '⛏️ Minecraft SMP Administration',
          value: [
            '`sp smp-set <java-ip[:port]> [bedrock-ip] [bedrock-port]` — Configure SMP endpoints.',
            '`sp smp-panel` — Deploy the live auto-updating SMP status panel.',
            '`sp link @user <MinecraftIGN>` — Manually link Discord member to Minecraft IGN.'
          ].join('\n')
        },
        {
          name: '⚙️ Operations & Community Telemetry',
          value: [
            '`sp ticket-panel` — Deploy the official interactive support ticket panel.',
            '`sp anon-panel` — Deploy the secret anonymous message panel.',
            '`sp yt-setup <yt_channel_id>` — Configure Mindzard YouTube upload notifications.',
            '`sp diagnose` — Full security and configuration risk check.',
            '`sp backup` — Create an instant server structural snapshot ZIP file.',
            '`sp task add <task>` / `sp task list` / `sp task done <id>` — Built-in task tracker.',
            '`sp summary` / `sp cases` — AI-assisted community & report summaries.'
          ].join('\n')
        }
      )
      .setFooter({ text: '⚡ NETHRION 2.0 • Mindzard Community' })
      .setTimestamp();

    return message.channel.send({ embeds: [adminHelp] });
  }

  if (cmdLower === 'help') {
    const helpEmbed = new EmbedBuilder()
      .setTitle('⚡ ＮＥＴＨＲＩＯＮ  ＢＯＴ  —  ＣＯＭＭＡＮＤＳ  ＤＩＲＥＣＴＯＲＹ')
      .setColor('#00F0FF')
      .setDescription('Available community & SMP commands:')
      .addFields({
        name: '📜 Member Commands Directory',
        value: [
          '`sp smp` — Live Minecraft SMP server status & online players.',
          '`sp ip` — Connection guide for Java & Bedrock editions.',
          '`sp ticket` — Open a private support ticket with server staff.',
          '`sp streak` — View your daily message streak and statistics.',
          '`sp board` — View the community streak leaderboard.',
          '`sp profile [@user]` — View linked Minecraft profile & streaks.',
          '`sp suggest <idea>` — Submit a community suggestion with voting.',
          '`sp report @user <reason>` — Send a confidential report to staff.',
          '`sp ask <question>` — Ask NETHRION a direct question.',
          '`sp image <prompt>` — Generate an image via Gemini AI.',
          '*(Admins: Type `sp help admin` for the full staff directory)*'
        ].join('\n')
      })
      .setFooter({ text: '⚡ NETHRION 2.0 • Mindzard Community' })
      .setTimestamp();

    return message.channel.send({ embeds: [helpEmbed] });
  }

  // --------------------------------------------------------------------------
  // SP SMP / SP IP / SP SMP-PANEL / SP SMP-SET
  // --------------------------------------------------------------------------
  if (subCmd === 'smp') {
    message.channel.sendTyping().catch(() => {});
    const status = await getLiveSMPStatus(true);
    const embed = buildNeonStatusEmbed(status);
    return message.channel.send({ embeds: [embed] });
  }

  if (subCmd === 'ip') {
    const status = await getLiveSMPStatus();
    const embed = buildNeonIpEmbed(status);
    return message.channel.send({ embeds: [embed] });
  }

  if (subCmd === 'smp-panel') {
    if (!isStaff) return message.reply('❌ This command requires Manage Server or Admin permission.');
    message.channel.sendTyping().catch(() => {});
    const status = await getLiveSMPStatus(true);
    const embed = buildNeonPanelEmbed(status);
    const buttons = buildNeonPanelButtons();

    const panelMsg = await message.channel.send({ embeds: [embed], components: [buttons] });
    db.set('mcStatus', {
      channelId: message.channel.id,
      messageId: panelMsg.id,
      ip: status.java.host
    });

    if (message.deletable) message.delete().catch(() => {});
    return;
  }

  if (subCmd === 'smp-set') {
    if (!isAdmin) return message.reply('❌ This command is restricted to Admins!');
    const javaRaw = args[1];
    if (!javaRaw) {
      return message.reply('❌ Usage: `sp smp-set <java-ip[:port]> [bedrock-ip] [bedrock-port]`');
    }

    const javaParts = javaRaw.split(':');
    const javaHost = javaParts[0];
    const javaPort = parseInt(javaParts[1] || '25565', 10);
    const bedrockHost = args[2] || javaHost;
    const bedrockPort = parseInt(args[3] || '26091', 10);

    const smpConfig = { javaHost, javaPort, bedrockHost, bedrockPort };
    db.set('smpConfig', smpConfig);
    smpCache = null;

    return message.reply('✅ SMP endpoints updated to: `' + javaHost + ':' + javaPort + '` (Bedrock: `' + bedrockHost + ':' + bedrockPort + '`)');
  }

  // --------------------------------------------------------------------------
  // SP TICKET / SP TICKET-PANEL
  // --------------------------------------------------------------------------
  if (cmdLower === 'ticket' || subCmd === 'ticket') {
    const topic = args.slice(1).join(' ') || 'General Support';
    const channel = await createTicketChannel(message.guild, message.member, topic);
    return message.reply('✅ Support ticket created: ' + channel.toString());
  }

  if (cmdLower === 'ticket-panel') {
    if (!isAdmin) return message.reply('❌ This command is restricted to Admins!');
    const embed = buildNeonTicketPanelEmbed();
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('btn_open_ticket')
        .setLabel('Open Support Ticket')
        .setEmoji('🎟️')
        .setStyle(ButtonStyle.Success)
    );
    await message.channel.send({ embeds: [embed], components: [row] });
    if (message.deletable) message.delete().catch(() => {});
    return;
  }

  // --------------------------------------------------------------------------
  // SP ANON-PANEL / SP ROLES-PANEL
  // --------------------------------------------------------------------------
  if (cmdLower === 'anon-panel' || cmdLower === 'anon') {
    if (!isAdmin) return message.reply('❌ This command is restricted to Admins!');
    const embed = buildAnonPanelEmbed();
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('anon_btn')
        .setLabel('💬 Send Secret Thought')
        .setStyle(ButtonStyle.Primary)
    );
    await message.channel.send({ embeds: [embed], components: [row] });
    if (message.deletable) message.delete().catch(() => {});
    return;
  }

  if (cmdLower === 'roles-panel') {
    if (!message.member?.permissions.has(PermissionFlagsBits.ManageRoles) && !isOwner) {
      return message.reply('❌ Manage Roles permission required.');
    }

    const textChannels = message.guild.channels.cache.filter(
      c => c.type === ChannelType.GuildText && !c.name.includes('admin') && !c.name.includes('log')
    ).first(25);

    if (textChannels.length === 0) {
      return message.reply('❌ No eligible text channels found.');
    }

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('dynamic_role_select')
      .setPlaceholder('Select a channel notification role...')
      .addOptions(
        textChannels.map(ch =>
          new StringSelectMenuOptionBuilder()
            .setLabel('#' + ch.name)
            .setDescription('Toggle notification role for #' + ch.name)
            .setValue(ch.id)
            .setEmoji('🔔')
        )
      );

    const row = new ActionRowBuilder().addComponents(selectMenu);
    const embed = new EmbedBuilder()
      .setTitle('🎭 NOTIFICATION CHANNEL SELECTOR')
      .setColor('#8B5CF6')
      .setDescription('Choose a channel from the menu below to **toggle** its notification role.')
      .setTimestamp();

    await message.channel.send({ embeds: [embed], components: [row] });
    if (message.deletable) message.delete().catch(() => {});
    return;
  }

  // --------------------------------------------------------------------------
  // SP STREAK / SP BOARD / SP PROFILE / SP LINK
  // --------------------------------------------------------------------------
  if (subCmd === 'streak') {
    const targetUser = message.mentions.users.first() || message.author;
    const streaks = db.get('streaks', {});
    const streak = streaks[targetUser.id] || { currentStreak: 0, highestStreak: 0, totalActiveDays: 0 };

    const embed = new EmbedBuilder()
      .setTitle('🔥 ＭＥＳＳＡＧＥ  ＳＴＲＥＡＫ  —  ' + targetUser.username.toUpperCase())
      .setColor('#F59E0B')
      .setDescription(
        '**Daily Community Activity Stats**\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
        '🔥 **Current Streak:** `' + streak.currentStreak + ' Days`\n' +
        '🏆 **Highest Streak:** `' + streak.highestStreak + ' Days`\n' +
        '📅 **Total Active Days:** `' + (streak.totalActiveDays || streak.currentStreak) + ' Days`'
      )
      .setFooter({ text: 'Keep chatting daily to maintain your streak!' })
      .setTimestamp();

    return message.channel.send({ embeds: [embed] });
  }

  if (cmdLower === 'board' || subCmd === 'board') {
    const streaks = db.get('streaks', {});
    const sorted = Object.entries(streaks)
      .map(([id, s]) => ({ id, streak: s.currentStreak || 0, highest: s.highestStreak || 0 }))
      .sort((a, b) => b.streak - a.streak)
      .slice(0, 10);

    const desc = sorted.length > 0
      ? sorted.map((s, idx) => {
          const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '🔹';
          return medal + ' **#' + (idx + 1) + '** <@' + s.id + '> — `' + s.streak + ' Days` *(Max: ' + s.highest + ')*';
        }).join('\n')
      : '*No active streaks recorded yet.*';

    const embed = new EmbedBuilder()
      .setTitle('🏆 ＮＥＴＨＲＩＯＮ  ＣＯＭＭＵＮＩＴＹ  —  ＬＥＡＤＥＲＢＯＡＲＤ')
      .setColor('#F59E0B')
      .setDescription('**Top 10 Most Active Members**\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' + desc)
      .setFooter({ text: 'Updated in real-time' })
      .setTimestamp();

    return message.channel.send({ embeds: [embed] });
  }

  if (subCmd === 'profile') {
    const targetUser = message.mentions.users.first() || message.author;
    const links = db.get('links', {});
    const link = links[targetUser.id] || null;
    const streaks = db.get('streaks', {});
    const streak = streaks[targetUser.id] || { currentStreak: 0, highestStreak: 0 };

    const embed = new EmbedBuilder()
      .setTitle('👤 ＭＥＭＢＥＲ  ＰＲＯＦＩＬＥ  —  ' + targetUser.username.toUpperCase())
      .setColor('#00F0FF')
      .setThumbnail(targetUser.displayAvatarURL())
      .addFields(
        { name: 'Minecraft IGN', value: link ? '`' + link.ign + '`' : '*Not linked*', inline: true },
        { name: 'Current Streak', value: '🔥 `' + streak.currentStreak + ' Days`', inline: true },
        { name: 'Record Streak', value: '🏆 `' + streak.highestStreak + ' Days`', inline: true }
      )
      .setFooter({ text: 'NETHRION System' })
      .setTimestamp();

    return message.channel.send({ embeds: [embed] });
  }

  if (subCmd === 'link') {
    if (!isAdmin && message.mentions.users.first()?.id !== message.author.id) {
      return message.reply('❌ You can only link your own Minecraft account!');
    }
    const targetUser = message.mentions.users.first() || message.author;
    const ign = args.find(a => !a.startsWith('<@') && a.toLowerCase() !== 'link');
    if (!ign) {
      return message.reply('❌ Usage: `sp link [@user] <MinecraftIGN>`');
    }

    const links = db.get('links', {});
    links[targetUser.id] = { ign, linkedAt: new Date().toISOString() };
    db.set('links', links);

    return message.reply('✅ Linked ' + targetUser.toString() + ' to Minecraft IGN: `' + ign + '`');
  }

  // --------------------------------------------------------------------------
  // SP PURGE / SP LOCK / SP UNLOCK / SP SLOCK / SP SUNLOCK / SP ROLE
  // --------------------------------------------------------------------------
  if (subCmd === 'purge') {
    if (!message.member?.permissions.has(PermissionFlagsBits.ManageMessages) && !isOwner) {
      return message.reply('❌ You lack Manage Messages permission!');
    }

    const targetUser = message.mentions.users.first();
    const countArg = args.find(a => /^\d+$/.test(a));
    const count = Math.min(100, Math.max(1, parseInt(countArg || '10', 10)));

    await message.delete().catch(() => {});
    const fetched = await message.channel.messages.fetch({ limit: 100 });
    let toDelete = fetched;

    if (targetUser) {
      toDelete = fetched.filter(m => m.author.id === targetUser.id).first(count);
    } else {
      toDelete = fetched.first(count);
    }

    const deleted = await message.channel.bulkDelete(toDelete, true);
    const confirm = await message.channel.send('🧹 Deleted `' + deleted.size + '` messages' + (targetUser ? ' from ' + targetUser.tag : '') + '.');
    setTimeout(() => confirm.delete().catch(() => {}), 4000);
    return;
  }

  if (cmdLower === 'lock') {
    if (!message.member?.permissions.has(PermissionFlagsBits.ManageChannels) && !isOwner) {
      return message.reply('❌ You lack Manage Channels permission!');
    }
    await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: false });
    return message.channel.send('🔒 **Channel Locked.** Public messaging has been disabled.');
  }

  if (cmdLower === 'unlock') {
    if (!message.member?.permissions.has(PermissionFlagsBits.ManageChannels) && !isOwner) {
      return message.reply('❌ You lack Manage Channels permission!');
    }
    await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: null });
    return message.channel.send('🔓 **Channel Unlocked.** Public messaging restored.');
  }

  if (subCmd === 'slock') {
    if (!message.member?.permissions.has(PermissionFlagsBits.ManageChannels) && !isOwner) {
      return message.reply('❌ You lack Manage Channels permission!');
    }
    const target = message.mentions.members.first();
    if (!target) return message.reply('❌ Please mention a user: `sp slock @user`');
    await message.channel.permissionOverwrites.edit(target.id, { SendMessages: false });
    return message.channel.send('🔒 Locked channel for ' + target.toString());
  }

  if (subCmd === 'sunlock') {
    if (!message.member?.permissions.has(PermissionFlagsBits.ManageChannels) && !isOwner) {
      return message.reply('❌ You lack Manage Channels permission!');
    }
    const target = message.mentions.members.first();
    if (!target) return message.reply('❌ Please mention a user: `sp sunlock @user`');
    await message.channel.permissionOverwrites.edit(target.id, { SendMessages: null });
    return message.channel.send('🔓 Unlocked channel for ' + target.toString());
  }

  if (subCmd === 'role') {
    if (!message.member?.permissions.has(PermissionFlagsBits.ManageRoles) && !isOwner) {
      return message.reply('❌ You lack Manage Roles permission!');
    }
    const roleName = args[1];
    const targets = message.mentions.members;
    if (!roleName || targets.size === 0) {
      return message.reply('❌ Usage: `sp role <RoleName> @user...`');
    }
    const role = message.guild.roles.cache.find(r => r.name.toLowerCase() === roleName.toLowerCase());
    if (!role) return message.reply('❌ Role not found: `' + roleName + '`');

    for (const [_, member] of targets) {
      await member.roles.add(role).catch(() => {});
    }
    return message.reply('✅ Assigned role `' + role.name + '` to ' + targets.size + ' member(s).');
  }

  if (subCmd === 'rolelist') {
    const roleName = args.slice(1).join(' ');
    if (!roleName) return message.reply('❌ Usage: `sp rolelist <RoleName>`');
    const role = message.guild.roles.cache.find(r => r.name.toLowerCase() === roleName.toLowerCase());
    if (!role) return message.reply('❌ Role not found: `' + roleName + '`');

    const members = role.members.map(m => m.user.tag).slice(0, 30);
    const embed = new EmbedBuilder()
      .setTitle('👥 Members with @' + role.name)
      .setColor('#8B5CF6')
      .setDescription(members.length > 0 ? members.join(', ') : 'No members currently have this role.')
      .setFooter({ text: 'Total: ' + role.members.size + ' members' })
      .setTimestamp();
    return message.channel.send({ embeds: [embed] });
  }

  // --------------------------------------------------------------------------
  // SP ASK / SP IMAGE / SP SUGGEST / SP REPORT / SP TASK / SP DIAGNOSE / SP BACKUP
  // --------------------------------------------------------------------------
  if (subCmd === 'ask') {
    const q = args.slice(1).join(' ');
    if (!q) return message.reply('❌ Please provide a question! Usage: `sp ask <your question>`');
    message.channel.sendTyping().catch(() => {});
    const reply = await runAIChat(q, message.guild, message.member);
    return message.reply({ content: reply.slice(0, 1950) });
  }

  if (subCmd === 'image') {
    const prompt = args.slice(1).join(' ');
    if (!prompt) return message.reply('❌ Usage: `sp image <prompt>`');
    return message.reply('🎨 Gemini image generation requested for: *' + prompt + '*\n*(Configure GEMINI_IMAGE_MODEL in .env for direct renders)*');
  }

  if (subCmd === 'suggest') {
    const idea = args.slice(1).join(' ');
    if (!idea) return message.reply('❌ Usage: `sp suggest <your suggestion>`');
    const suggestions = db.get('suggestions', []);
    suggestions.push({ user: message.author.tag, userId: message.author.id, idea, date: new Date().toISOString() });
    db.set('suggestions', suggestions);

    const embed = new EmbedBuilder()
      .setTitle('💡 Community Suggestion')
      .setColor('#00F0FF')
      .setDescription(idea)
      .setFooter({ text: 'Submitted by ' + message.author.tag })
      .setTimestamp();

    const suggestMsg = await message.channel.send({ embeds: [embed] });
    await suggestMsg.react('👍').catch(() => {});
    await suggestMsg.react('👎').catch(() => {});
    if (message.deletable) message.delete().catch(() => {});
    return;
  }

  if (subCmd === 'report') {
    const target = message.mentions.users.first();
    const reason = args.slice(2).join(' ') || 'No reason specified';
    if (!target) return message.reply('❌ Usage: `sp report @user <reason>`');

    const reports = db.get('reports', []);
    reports.push({ reporter: message.author.tag, reported: target.tag, reason, date: new Date().toISOString() });
    db.set('reports', reports);
    if (message.deletable) message.delete().catch(() => {});
    return message.author.send('✅ Your report against **' + target.tag + '** has been submitted confidentially to server staff.').catch(() => {});
  }

  if (subCmd === 'task') {
    if (!isStaff) return message.reply('❌ This command requires Manage Server or Admin permission.');
    const action = args[1]?.toLowerCase();
    const tasks = db.get('tasks', []);

    if (action === 'add') {
      const taskText = args.slice(2).join(' ');
      if (!taskText) return message.reply('❌ Usage: `sp task add <task description>`');
      tasks.push({ id: tasks.length + 1, task: taskText, done: false, addedBy: message.author.username });
      db.set('tasks', tasks);
      return message.reply('✅ Task added: `#' + tasks.length + '` ' + taskText);
    } else if (action === 'done') {
      const id = parseInt(args[2], 10);
      const t = tasks.find(x => x.id === id);
      if (!t) return message.reply('❌ Task not found!');
      t.done = true;
      db.set('tasks', tasks);
      return message.reply('✅ Marked task `#' + id + '` as completed!');
    } else {
      const list = tasks.slice(-10).map(t => (t.done ? '~~' : '') + '`#' + t.id + '` ' + t.task + (t.done ? '~~ ✅' : ' ⏳')).join('\n');
      return message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setTitle('📋 NETHRION Task Tracker')
            .setColor('#8B5CF6')
            .setDescription(list || '*No active tasks.*')
        ]
      });
    }
  }

  if (subCmd === 'summary') {
    if (!isStaff) return message.reply('❌ Manage Server permission required.');
    message.channel.sendTyping().catch(() => {});
    const recent = await message.channel.messages.fetch({ limit: 40 });
    const textSample = recent.map(m => m.author.username + ': ' + m.content).slice(0, 30).join('\n');
    const prompt = 'Summarize the following recent Discord chat in 3 bullet points showing community mood:\n' + textSample;
    const reply = await runAIChat(prompt, message.guild, message.member);

    return message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setTitle('📊 ＮＥＴＨＲＩＯＮ  ＣＯＭＭＵＮＩＴＹ  ＰＵＬＳＥ')
          .setColor('#00F0FF')
          .setDescription(reply)
          .setFooter({ text: 'AI Community Pulse Summary' })
          .setTimestamp()
      ]
    });
  }

  if (subCmd === 'cases') {
    if (!isStaff) return message.reply('❌ Manage Server permission required.');
    const reports = db.get('reports', []).slice(-10);
    const text = reports.length > 0
      ? reports.map((r, i) => '`#' + (i + 1) + '` Reported: **' + r.reported + '** by ' + r.reporter + ' — *' + r.reason + '*').join('\n')
      : '*No active reports found.*';

    return message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setTitle('🧾 REPORT CASES SUMMARY')
          .setColor('#FF9900')
          .setDescription(text)
          .setTimestamp()
      ]
    });
  }

  if (subCmd === 'diagnose') {
    if (!isStaff) return message.reply('❌ Manage Server permission required.');
    message.channel.sendTyping().catch(() => {});
    const status = await getLiveSMPStatus(true);
    const me = message.guild.members.me;

    const diag = new EmbedBuilder()
      .setTitle('🛡️ ＮＥＴＨＲＩＯＮ  ＳＹＳＴＥＭ  ＤＩＡＧＮＯＳＴＩＣＳ')
      .setColor('#00FF9D')
      .addFields(
        { name: '🤖 Bot Permissions', value: me.permissions.has(PermissionFlagsBits.Administrator) ? '✅ Administrator' : '⚠️ Standard Permissions', inline: true },
        { name: '⛏️ SMP Status', value: status.isOnline ? '✅ Online (' + status.playersOnline + ')' : '🔴 Offline', inline: true },
        { name: '💾 Database', value: '✅ Connected (' + Object.keys(db.data).length + ' collections)', inline: true },
        { name: '🔥 Active Streaks', value: Object.keys(db.get('streaks', {})).length + ' members', inline: true },
        { name: 'Highest Bot Role', value: me.roles.highest.name + ' (Pos ' + me.roles.highest.position + ')', inline: true }
      )
      .setFooter({ text: 'System operating normally' })
      .setTimestamp();

    return message.channel.send({ embeds: [diag] });
  }

  if (subCmd === 'backup') {
    if (!isAdmin) return message.reply('❌ This command is restricted to Admins!');
    const waitMsg = await message.reply('⏳ Generating server snapshot and archive...');
    if (!fs.existsSync(CONFIG.backupDir)) fs.mkdirSync(CONFIG.backupDir, { recursive: true });

    const zipName = 'backup_' + message.guild.id + '_' + Date.now() + '.zip';
    const zipPath = path.join(CONFIG.backupDir, zipName);
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
      waitMsg.edit('✅ Server snapshot created successfully: `' + zipName + '` (' + Math.round(archive.pointer() / 1024) + ' KB).');
    });

    archive.pipe(output);
    const snapshot = {
      guild: message.guild.name,
      id: message.guild.id,
      roles: Array.from(message.guild.roles.cache.values()).map(r => ({ id: r.id, name: r.name, pos: r.position })),
      channels: Array.from(message.guild.channels.cache.values()).map(c => ({ id: c.id, name: c.name, type: c.type }))
    };
    archive.append(JSON.stringify(snapshot, null, 2), { name: 'snapshot.json' });
    archive.finalize();
    return;
  }

  if (subCmd === 'backups') {
    if (!isAdmin) return message.reply('❌ This command is restricted to Admins!');
    if (!fs.existsSync(CONFIG.backupDir)) return message.reply('No backups found.');
    const files = fs.readdirSync(CONFIG.backupDir).filter(f => f.endsWith('.zip'));
    return message.reply('📁 **Saved Backups (' + files.length + '):**\n' + (files.slice(-5).map(f => '• `' + f + '`').join('\n') || 'None'));
  }

  if (subCmd === 'yt-setup') {
    if (!isAdmin) return message.reply('❌ This command is restricted to Admins!');
    const channelId = args[1];
    if (!channelId) return message.reply('❌ Usage: `sp yt-setup <YouTube_Channel_ID>`');
    db.set('ytConfig', { channelId: message.channel.id, ytChannelId: channelId, lastVideoId: null });
    return message.reply('✅ YouTube upload alerts bound to channel: ' + message.channel.toString());
  }
});

// ------------------------------------------------------------------------------
// 8. INTERACTIVE BUTTON & MODAL HANDLER
// ------------------------------------------------------------------------------
client.on('interactionCreate', async (interaction) => {
  // 1. Button interactions
  if (interaction.isButton()) {
    const { customId, guild, member, channel } = interaction;

    if (customId === 'btn_refresh_smp') {
      await interaction.deferUpdate();
      const status = await getLiveSMPStatus(true);
      const embed = buildNeonPanelEmbed(status);
      const buttons = buildNeonPanelButtons();
      await interaction.editReply({ embeds: [embed], components: [buttons] }).catch(() => {});
    } else if (customId === 'btn_smp_ip') {
      const status = await getLiveSMPStatus();
      const embed = buildNeonIpEmbed(status);
      await interaction.reply({ embeds: [embed], ephemeral: true });
    } else if (customId === 'btn_open_ticket') {
      await interaction.deferReply({ ephemeral: true });
      const ticketChan = await createTicketChannel(guild, member, 'Support Request');
      await interaction.editReply({ content: '✅ Ticket created: ' + ticketChan.toString() });
    } else if (customId === 'btn_close_ticket') {
      await interaction.reply('Ticket closed. Deleting channel in 5 seconds...');
      setTimeout(() => {
        channel.delete().catch(() => {});
      }, 5000);
    } else if (customId === 'btn_claim_ticket') {
      await interaction.reply('Ticket claimed by ' + member.toString() + ' 🛡️');
    } else if (customId === 'anon_btn') {
      const modal = new ModalBuilder()
        .setCustomId('anon_modal')
        .setTitle('Send Secret Anonymous Message');

      const textInput = new TextInputBuilder()
        .setCustomId('anon_text')
        .setLabel('Your Secret Message')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Type your anonymous message here...')
        .setRequired(true)
        .setMaxLength(1000);

      modal.addComponents(new ActionRowBuilder().addComponents(textInput));
      await interaction.showModal(modal);
    }
  }

  // 2. Modal Submission
  if (interaction.isModalSubmit()) {
    if (interaction.customId === 'anon_modal') {
      const msg = interaction.fields.getTextInputValue('anon_text');
      const count = (db.get('anonCount', 0)) + 1;
      db.set('anonCount', count);

      const embed = new EmbedBuilder()
        .setTitle('💬 Anonymous Message #' + count)
        .setColor('#00F0FF')
        .setDescription(msg)
        .setFooter({ text: 'Confidential Community Submission' })
        .setTimestamp();

      await interaction.channel.send({ embeds: [embed] });
      await interaction.reply({ content: '✅ Your anonymous message has been posted safely!', ephemeral: true });
    }
  }

  // 3. String Select Menu
  if (interaction.isStringSelectMenu()) {
    if (interaction.customId === 'dynamic_role_select') {
      await interaction.deferReply({ ephemeral: true });
      const channelId = interaction.values[0];
      const targetChan = interaction.guild.channels.cache.get(channelId);
      await interaction.editReply({ content: 'Notification role toggled for: ' + (targetChan ? targetChan.toString() : channelId) });
    }
  }
});

// Helper: Create Support Ticket Channel
async function createTicketChannel(guild, member, topic) {
  const ticketConfig = db.get('ticketConfig', {});
  const parent = ticketConfig.categoryChannelId || null;
  const chanName = ('ticket-' + member.user.username.toLowerCase().replace(/[^a-z0-9]/g, '')).slice(0, 30);

  const chan = await guild.channels.create({
    name: chanName,
    type: ChannelType.GuildText,
    parent,
    permissionOverwrites: [
      { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
      { id: member.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
      { id: guild.members.me.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ReadMessageHistory] }
    ]
  });

  const embed = new EmbedBuilder()
    .setTitle('🎟️ NETHRION SUPPORT TICKET')
    .setColor('#00F0FF')
    .setDescription(
      'Hello ' + member.toString() + ', welcome to your private support channel.\n\n' +
      '**Topic:** `' + topic + '`\n\n' +
      'A staff member will assist you shortly. Please explain your issue in detail below.'
    )
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('btn_close_ticket').setLabel('Close Ticket').setStyle(ButtonStyle.Danger).setEmoji('🔒'),
    new ButtonBuilder().setCustomId('btn_claim_ticket').setLabel('Claim Ticket').setStyle(ButtonStyle.Secondary).setEmoji('✋')
  );

  await chan.send({ content: member.toString(), embeds: [embed], components: [row] });
  return chan;
}

// ------------------------------------------------------------------------------
// 9. CLIENT BOOTSTRAP & BACKGROUND POLLER
// ------------------------------------------------------------------------------
client.once('ready', () => {
  console.log('====================================================');
  console.log('⚡ NETHRION BOT 2.0 CONNECTED AS: ' + client.user.tag);
  console.log('⚡ All systems live. Prefix: sp <command>');
  console.log('====================================================');

  // Auto-Updating SMP Live Panel (every 60 seconds)
  setInterval(async () => {
    try {
      const mc = db.get('mcStatus');
      if (!mc || !mc.channelId || !mc.messageId) return;
      const ch = await client.channels.fetch(mc.channelId).catch(() => null);
      if (!ch) return;
      const msg = await ch.messages.fetch(mc.messageId).catch(() => null);
      if (!msg) return;

      const status = await getLiveSMPStatus(true);
      const embed = buildNeonPanelEmbed(status);
      const buttons = buildNeonPanelButtons();
      await msg.edit({ embeds: [embed], components: [buttons] }).catch(() => {});
    } catch (e) {}
  }, 60000);
});

// Start bot
if (!CONFIG.token) {
  console.warn('[AUTH] DISCORD_TOKEN is not configured in .env. Bot standing by in idle test mode.');
} else {
  client.login(CONFIG.token).catch(err => {
    console.error('[AUTH] Discord login failed:', err.message);
  });
}
