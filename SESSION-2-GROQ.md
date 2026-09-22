# Spark — Session 2 AI build

Added Groq-backed, structured JSON AI services:
- conservative moderation escalation for messages that local rules flag
- report summaries (`sp cases`)
- community summaries (`sp summary`)
- member profiles (`sp profile`)
- server diagnostics (`sp diagnose`)
- structure backups (`sp backup`)
- server-aware assistant (`sp ask`)
- security alerts for bursts of privileged role/channel changes
- voice activity tracking groundwork
- SMP panel polling every 15s, with Discord edits only when state changes
- `sp ip` with clean server details

AI never directly executes Discord permission actions. It returns structured analysis; the bot's deterministic code decides whether an action is allowed.
