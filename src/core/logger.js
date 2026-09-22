// NETHRION BOT 2.0 - Structured Production Logger
const fs = require('fs');
const path = require('path');

const LogLevel = {
  DEBUG: 0,
  INFO: 1,
  AUDIT: 2,
  WARN: 3,
  ERROR: 4
};

const LevelNames = ['DEBUG', 'INFO', 'AUDIT', 'WARN', 'ERROR'];
const LevelColors = {
  DEBUG: '\x1b[36m', // Cyan
  INFO: '\x1b[32m',  // Green
  AUDIT: '\x1b[35m', // Magenta
  WARN: '\x1b[33m',  // Yellow
  ERROR: '\x1b[31m', // Red
  RESET: '\x1b[0m'
};

class Logger {
  constructor(logFilePath = null) {
    this.logFilePath = logFilePath || path.join(__dirname, '../../data/nethrion.log');
    this.memoryBuffer = [];
    this.maxMemoryBuffer = 200;

    const logDir = path.dirname(this.logFilePath);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  _format(level, scope, message, meta = null) {
    const timestamp = new Date().toISOString();
    const color = LevelColors[level] || '';
    const reset = LevelColors.RESET;
    const metaStr = meta ? ' ' + JSON.stringify(meta) : '';
    const consoleMsg = `${timestamp} [${color}${level}${reset}] [${scope}] ${message}${metaStr}`;
    const fileMsg = `${timestamp} [${level}] [${scope}] ${message}${metaStr}\n`;
    return { consoleMsg, fileMsg, timestamp, level, scope, message, meta };
  }

  _write(level, scope, message, meta) {
    const { consoleMsg, fileMsg, timestamp } = this._format(level, scope, message, meta);
    console.log(consoleMsg);

    this.memoryBuffer.push({ timestamp, level, scope, message, meta });
    if (this.memoryBuffer.length > this.maxMemoryBuffer) {
      this.memoryBuffer.shift();
    }

    try {
      fs.appendFileSync(this.logFilePath, fileMsg, 'utf8');
    } catch (e) {
      console.error('Logger file write error:', e.message);
    }
  }

  debug(scope, message, meta) { this._write('DEBUG', scope, message, meta); }
  info(scope, message, meta) { this._write('INFO', scope, message, meta); }
  audit(scope, message, meta) { this._write('AUDIT', scope, message, meta); }
  warn(scope, message, meta) { this._write('WARN', scope, message, meta); }
  error(scope, message, meta) { this._write('ERROR', scope, message, meta); }

  getRecentLogs(limit = 50) {
    return this.memoryBuffer.slice(-limit);
  }
}

const logger = new Logger();
module.exports = logger;
