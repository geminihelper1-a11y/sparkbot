# NETHRION Bot 2.0 release notes

This release rebuilds the supplied SparkBot project into a modular NETHRION runtime.

Highlights:

- centralized permission/hierarchy checks
- typed action engine with previews and confirmation
- durable SQLite memory, knowledge, audit, analytics, jobs and action plans
- Gemini-first Interactions API function calling with Groq fallback
- live Discord indexing and periodic reconciliation
- normalized Java/Bedrock Minecraft status
- transition-based SMP alerts
- grouped security incidents
- private tickets and transcript access
- suggestion grouping and actionable analytics
- owner health diagnostics
- local authenticated control center
- reversible role/channel/mode actions where technically supported
- legacy JSON migration script with pre-migration source copy
- staged rollout via feature flags

Intentionally not promoted to public v2 core:

- image generation
- YouTube automation
- broad legacy customization/autoresponder/voice/giveaway extras
- automatic creation of a large channel tree

The design favors a smaller reliable public surface over exposing every historical feature immediately.

## 10.0.1 command compatibility fix
- Restored legacy `sp help` and `sp help admin` prefix help.
- `sp help` shows public/member commands.
- `sp help admin` shows member, staff, and admin/owner commands and requires Administrator or server-owner access.


## Public response layer hardening
All user-facing Discord responses now pass through shared NETHRION formatters. Raw tool JSON, internal Discord IDs, provider metadata, evidence objects, and database-shaped responses are no longer used as normal public reply text. AI tool fallbacks are rendered as concise human-readable answers, and the control center/overview/SMP/health/analytics/recap surfaces use the same visual language.


## 10.0.2 — Panel Command Restoration
- `sp smp-panel` creates or refreshes a live SMP panel in the current channel.
- `sp ticket-panel`, `sp roles-panel`, and `sp anon-panel` create functional panels instead of a setup placeholder.
- Public panel copy is concise and avoids internal IDs or raw JSON.
- SMP panels refresh automatically every 60 seconds and on configuration update.
