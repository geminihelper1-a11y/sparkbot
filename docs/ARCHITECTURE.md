# Architecture

## Composition root

`src/app/index.js` wires the Discord client, services, scheduler, dashboard, command routing and event listeners. It is deliberately a composition root rather than a feature implementation dump.

## Service boundaries

`config` validates environment defaults.

`storage` owns SQLite schema and repositories.

`discord` is authoritative for live Discord state and exposes bounded reads.

`permissions` evaluates real Discord permissions, effective channel access, managed-role rules and bot hierarchy.

`resolvers` resolves exact IDs/mentions first, then exact names, normalized names and conservative fuzzy matches.

`actions` owns inspect/plan/authorize/confirm/execute/verify/audit for important writes.

`ai` owns provider adapters, quotas, fallback and the agent loop. The agent receives typed tools; it never receives direct Discord authority.

`knowledge`, `memory`, `analytics`, `recap`, `moderation`, `tickets`, `suggestions`, `minecraft`, `scheduler`, `backups` and `health` each own their data flow.

## Data authority

Discord is authoritative for Discord state.

Minecraft adapters are authoritative for live Minecraft state.

SQLite is authoritative for NETHRION-owned state such as scheduled jobs, action plans, memory, knowledge, reports, tickets, analytics, audit records and backups.

AI memory and model output are never treated as authoritative state.

## Action lifecycle

1. Inspect current live state.
2. Resolve the target conservatively.
3. Evaluate actor and bot permissions.
4. Build an exact action plan.
5. Require confirmation for high/critical operations.
6. Revalidate the stored plan at confirmation time.
7. Execute once with bounded behavior.
8. Verify the resulting state when possible.
9. Write audit and analytics records.
10. Return the actual result state: SUCCESS, PARTIAL, BLOCKED, UNKNOWN or FAILED.

## State freshness

Discord gateway events update local indexes. A durable reconciliation job refreshes the guild model every 15 minutes. Sensitive writes still perform live permission/target checks immediately before execution.

Minecraft status is sampled separately and stores timestamps, edition, provider, result and normalized state. A single timeout becomes `UNKNOWN`, not confirmed offline.

## AI routing

Gemini is primary. Groq is an optional fallback. Deterministic operations stay local. AI is used for language understanding, synthesis and tool orchestration. Per-user, per-guild and global daily quotas plus an in-process concurrency cap limit AI load.

## Scheduling

Scheduled jobs are database rows. Each execution has a durable `run_key`, run status, retry count and next-run time. Repeating jobs compute their next occurrence after success. Failed jobs receive bounded retries and then become `FAILED` instead of looping forever.
