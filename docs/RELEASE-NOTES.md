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
