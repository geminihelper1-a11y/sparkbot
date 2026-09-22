# Backups

Backups are owner/staff operations and are stored outside the source tree under `BACKUP_DIR`.

Each backup writes:

- a JSON manifest containing schema/version metadata, guild metadata, roles and channels
- a SQLite database snapshot
- a SHA-256 checksum across the manifest and SQLite snapshot
- a database row recording location, checksum and creation time

Retention is enforced by `BACKUP_RETENTION` per guild.

The manifest explicitly states scope limitations. The system does not claim to restore Discord-managed data it cannot reconstruct.

Before production use, copy the backup directory to independent storage and periodically test that a snapshot can be opened with a SQLite client.
