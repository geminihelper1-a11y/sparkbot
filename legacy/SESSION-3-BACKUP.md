# Spark NETHRION — Session 3 Backup Upgrade

Added a full server snapshot system behind `sp backup` for the owner/Administrators.

The backup captures, where Discord exposes the data:
- server metadata
- roles + permissions + hierarchy state
- members + role assignments
- categories/channels + settings + permission overwrites
- accessible message history
- message authors, timestamps, edits, mentions, attachments metadata/URLs, embeds, stickers and reaction counts
- active thread history
- emojis and stickers metadata
- scheduled events
- bans
- webhooks metadata

The archive is packaged as a compressed ZIP with a manifest and README.

The bot deliberately does not claim to back up data Discord does not expose. Attachment binary files themselves are not downloaded, and DMs are never included.

`sp backups` lists recent backups on the current host.

Backup access is restricted to the guild owner or Administrators because the archive can contain private moderation/member data.
