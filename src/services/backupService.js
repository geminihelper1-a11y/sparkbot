// NETHRION BOT 2.0 - Safe Archival Guild Backup Service
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const config = require('../core/config');
const logger = require('../core/logger');

class BackupService {
  /**
   * Generates a structural JSON snapshot and zips it
   */
  async createGuildBackup(guild) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = config.paths.backupsDir;
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const zipFileName = `backup_${guild.id}_${timestamp}.zip`;
    const zipFilePath = path.join(backupDir, zipFileName);

    // Build guild snapshot object
    const snapshot = {
      guildId: guild.id,
      name: guild.name,
      createdAt: new Date().toISOString(),
      memberCount: guild.memberCount,
      roles: Array.from(guild.roles.cache.values()).map(r => ({
        id: r.id,
        name: r.name,
        color: r.color,
        hoist: r.hoist,
        position: r.position,
        permissions: r.permissions.bitfield.toString()
      })),
      channels: Array.from(guild.channels.cache.values()).map(c => ({
        id: c.id,
        name: c.name,
        type: c.type,
        parent: c.parentId,
        position: c.position
      }))
    };

    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(zipFilePath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      output.on('close', () => {
        logger.info('BACKUP', `Created guild backup: ${zipFilePath} (${archive.pointer()} bytes)`);
        resolve({
          filePath: zipFilePath,
          fileName: zipFileName,
          sizeBytes: archive.pointer(),
          snapshot
        });
      });

      archive.on('error', (err) => {
        logger.error('BACKUP', 'Archiver error', { error: err.message });
        reject(err);
      });

      archive.pipe(output);
      archive.append(JSON.stringify(snapshot, null, 2), { name: 'guild_snapshot.json' });
      archive.finalize();
    });
  }
}

const backupService = new BackupService();
module.exports = backupService;
