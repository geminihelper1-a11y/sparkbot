# Spark Session 5 — Natural Actions + Image Layer

Added an explicit natural-language action layer to Spark chat.

- Clear requests can now call approved Spark write tools instead of requiring exact `sp` syntax.
- Examples: delete recent messages, assign/remove roles, post to a named channel, lock/unlock, task actions, SMP setup, reports, suggestions, tickets, backup, panels.
- Every write tool checks the caller's real Discord permissions and role hierarchy.
- Ambiguous role/channel targets are not guessed.
- Destructive purge actions above 20 messages require explicit confirmation.
- Outgoing bot messages disable automatic mentions by default.
- Added optional image generation through `OPENAI_API_KEY` with a fixed NETHRION image style guide applied to every generation.
- Natural chat can use the same live tools for current server/SMP facts.
