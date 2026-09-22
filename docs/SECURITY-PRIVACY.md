# Security and privacy model

Secrets are environment-only. Do not commit `.env`, tokens, API keys, RCON credentials or generated SQLite files.

Public, staff and owner scopes are different. Public requests are limited to normal support and safe public reads. Staff-only tools check real `ManageGuild`, `ViewAuditLog` or equivalent permissions. Owner-only operations compare against `guild.ownerId`.

Staff investigations can include audit logs, reports, incidents and ticket transcripts. These are not automatically included in public model context.

The AI system prompt treats message history, Minecraft chat, ticket content, suggestions, uploaded text and external API data as untrusted data rather than instructions.

History search is bounded and respects `ViewChannel` for the caller. The system does not intentionally send entire guilds, entire databases or complete message archives to the model.

Memory is durable but scoped. A member can access their own stored memory. Access to another member's memory requires staff authorization. Memory is not permission authority and can expire.

Backups contain NETHRION-owned SQLite state plus Discord-exposed metadata selected by the backup manifest. The implementation does not claim to back up Discord data it cannot access or reconstruct.

High-risk actions keep an action plan with actor, target and expiration. Confirmation requires the same actor and a current plan matching the stored target.

Use a private staff channel for operational alerts. Configure `alertChannelId`, `smpAlertChannelId`, `welcomeChannelId`, `ticketCategoryId`, and role IDs only through trusted configuration sources.

Before public launch, review backup retention, staff access, dashboard exposure, message-content intent, moderation evidence retention, and AI provider data-use terms applicable to the chosen provider/account.
