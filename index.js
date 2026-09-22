// ============================================================
// NETHRION BOT 2.0 — Discord & Minecraft SMP Operating System
// Built for the Mindzard Community
// ============================================================
const { Client, GatewayIntentBits, Partials, REST, Routes } = require('discord.js');
const config = require('./src/core/config');
const logger = require('./src/core/logger');
const database = require('./src/core/database');
const EventRouter = require('./src/discord/eventRouter');
const SlashCommandHandler = require('./src/discord/slashCommands');
const minecraftService = require('./src/services/minecraftService');
const youtubeService = require('./src/services/youtubeService');

async function bootstrap() {
  logger.info('BOOT', '================================================');
  logger.info('BOOT', 'Starting NETHRION BOT 2.0...');
  logger.info('BOOT', '================================================');

  // 1. Initialize atomic database
  database.init();

  // 2. Initialize Discord Client
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

  // 3. Bind client to background services
  minecraftService.setClient(client);
  youtubeService.setClient(client);

  // 4. Register unified event listeners
  EventRouter.registerEvents(client);

  // 5. On Gateway Ready
  client.once('ready', async () => {
    logger.info('GATEWAY', `Connected to Discord as ${client.user.tag} (ID: ${client.user.id})`);
    logger.info('GATEWAY', `Serving ${client.guilds.cache.size} guild(s) with ${client.users.cache.size} cached users.`);

    // Register Slash Commands
    try {
      const rest = new REST({ version: '10' }).setToken(config.discord.token);
      const commands = SlashCommandHandler.getDefinitions();

      if (config.discord.guildId) {
        await rest.put(
          Routes.applicationGuildCommands(client.user.id, config.discord.guildId),
          { body: commands }
        );
        logger.info('SLASH', `Registered ${commands.length} guild slash command(s).`);
      } else {
        await rest.put(
          Routes.applicationCommands(client.user.id),
          { body: commands }
        );
        logger.info('SLASH', `Registered ${commands.length} global slash command(s).`);
      }
    } catch (err) {
      logger.warn('SLASH', 'Failed to register slash commands', { error: err.message });
    }

    // Start background pollers
    minecraftService.startAutoUpdater();
    youtubeService.startPoller();
    logger.info('SERVICES', 'Background telemetry and upload pollers activated.');
  });

  // 6. Graceful shutdown handler
  const shutdown = (signal) => {
    logger.info('SYSTEM', `Received ${signal}. Shutting down cleanly...`);
    database.saveSync();
    client.destroy();
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  // 7. Login to Discord
  if (!config.discord.token) {
    logger.warn('AUTH', 'DISCORD_TOKEN is not set in environment or .env file. Bot is idle in offline test mode.');
    return;
  }

  await client.login(config.discord.token);
}

// Error handling to prevent silent process crashes
process.on('unhandledRejection', (reason, promise) => {
  logger.error('SYSTEM', 'Unhandled Promise Rejection', { reason: reason ? reason.stack || reason : 'Unknown' });
});

process.on('uncaughtException', (err) => {
  logger.error('SYSTEM', 'Uncaught Exception', { error: err.stack || err.message });
});

bootstrap();
