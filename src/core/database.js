// NETHRION BOT 2.0 - Atomic JSON Persistence with Legacy Migration
const fs = require('fs');
const path = require('path');
const config = require('./config');
const logger = require('./logger');

class Database {
  constructor() {
    this.filePath = config.paths.database;
    this.legacyPath = config.paths.legacyDatabase;
    this.data = {};
    this.saveTimeout = null;
    this.isDirty = false;
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;

    const dataDir = path.dirname(this.filePath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    if (fs.existsSync(this.filePath)) {
      try {
        const raw = fs.readFileSync(this.filePath, 'utf8');
        this.data = JSON.parse(raw);
        logger.info('DATABASE', 'Loaded Nethrion database.', { path: this.filePath });
      } catch (err) {
        logger.error('DATABASE', 'Failed to parse database, backing up and creating fresh store.', { error: err.message });
        const corruptBackup = this.filePath + '.corrupt.' + Date.now();
        fs.renameSync(this.filePath, corruptBackup);
        this.data = this._getDefaults();
        this.saveSync();
      }
    } else if (fs.existsSync(this.legacyPath)) {
      // Automatic migration from legacy data.json
      try {
        const raw = fs.readFileSync(this.legacyPath, 'utf8');
        const legacy = JSON.parse(raw);
        logger.info('DATABASE', 'Migrating legacy data.json to Nethrion 2.0 format...', { path: this.legacyPath });
        this.data = this._migrateLegacy(legacy);
        this.saveSync();
        logger.info('DATABASE', 'Migration complete. Saved to ' + this.filePath);
      } catch (err) {
        logger.error('DATABASE', 'Failed to migrate legacy data.json, initializing defaults.', { error: err.message });
        this.data = this._getDefaults();
        this.saveSync();
      }
    } else {
      this.data = this._getDefaults();
      this.saveSync();
      logger.info('DATABASE', 'Initialized fresh Nethrion database.');
    }

    this.initialized = true;
  }

  _getDefaults() {
    return {
      version: '2.0.0',
      mcStatus: {
        channelId: null,
        messageId: null,
        ip: config.minecraft.javaHost
      },
      smpConfig: {
        javaHost: config.minecraft.javaHost,
        javaPort: config.minecraft.javaPort,
        bedrockHost: config.minecraft.bedrockHost,
        bedrockPort: config.minecraft.bedrockPort
      },
      ytConfig: {
        channelId: null,
        ytChannelId: config.youtube.channelId,
        lastVideoId: null
      },
      ticketConfig: {
        channelId: null,
        categoryChannelId: null,
        logChannelId: null
      },
      streaks: {},
      links: {}, // Discord ID -> Minecraft UUID & Name
      reports: [],
      suggestions: [],
      infractions: {}, // Member ID -> [cases]
      settings: {
        autoModeration: true,
        antiRaid: true,
        aiEnabled: true,
        logChannelId: null
      },
      tags: {}
    };
  }

  _migrateLegacy(legacy) {
    const defaults = this._getDefaults();
    return {
      version: '2.0.0',
      mcStatus: {
        channelId: legacy.mcStatus?.channelId || defaults.mcStatus.channelId,
        messageId: legacy.mcStatus?.messageId || defaults.mcStatus.messageId,
        ip: legacy.mcStatus?.ip || defaults.mcStatus.ip
      },
      smpConfig: {
        javaHost: legacy.smpConfig?.javaHost || defaults.smpConfig.javaHost,
        javaPort: legacy.smpConfig?.javaPort || defaults.smpConfig.javaPort,
        bedrockHost: legacy.smpConfig?.bedrockHost || defaults.smpConfig.bedrockHost,
        bedrockPort: legacy.smpConfig?.bedrockPort || defaults.smpConfig.bedrockPort
      },
      ytConfig: {
        channelId: legacy.ytConfig?.channelId || defaults.ytConfig.channelId,
        ytChannelId: legacy.ytConfig?.ytChannelId || defaults.ytConfig.ytChannelId,
        lastVideoId: legacy.ytConfig?.lastVideoId || defaults.ytConfig.lastVideoId
      },
      ticketConfig: {
        channelId: legacy.ticketConfig?.channelId || defaults.ticketConfig.channelId,
        categoryChannelId: null,
        logChannelId: null
      },
      streaks: legacy.streaks || {},
      links: legacy.links || {},
      reports: Array.isArray(legacy.reports) ? legacy.reports : [],
      suggestions: [],
      infractions: {},
      settings: defaults.settings,
      tags: {}
    };
  }

  get(key, defaultValue = null) {
    this.init();
    if (this.data[key] === undefined) {
      return defaultValue;
    }
    return this.data[key];
  }

  set(key, value) {
    this.init();
    this.data[key] = value;
    this.isDirty = true;
    this.scheduleSave();
  }

  update(key, updateFn) {
    this.init();
    const current = this.get(key, null);
    const updated = updateFn(current);
    this.set(key, updated);
    return updated;
  }

  scheduleSave(delayMs = 2000) {
    if (this.saveTimeout) clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => {
      this.saveSync();
    }, delayMs);
  }

  saveSync() {
    if (!this.initialized && !this.isDirty) return;
    try {
      const serialized = JSON.stringify(this.data, null, 2);
      const tempPath = this.filePath + '.tmp.' + Date.now();
      fs.writeFileSync(tempPath, serialized, 'utf8');
      fs.renameSync(tempPath, this.filePath);
      this.isDirty = false;
      if (this.saveTimeout) {
        clearTimeout(this.saveTimeout);
        this.saveTimeout = null;
      }
    } catch (err) {
      logger.error('DATABASE', 'Atomic database write error:', { error: err.message });
    }
  }
}

const database = new Database();
module.exports = database;
