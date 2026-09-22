# NETHRION Bot 2.0

Production-oriented rebuild of the supplied SparkBot / NETHRION Discord + Minecraft bot.

NETHRION is designed as one connected operating system for the Discord community and Minecraft SMP. The AI can reason, retrieve, plan and explain, but application services own authorization and execution.

## What changed

The legacy bot was feature-rich but concentrated around a large `index.js` and JSON persistence. This release keeps useful legacy behavior behind a migration boundary and moves new behavior into focused services.

The main runtime is split into:

- Discord event and command handling
- live entity resolution
- permission and hierarchy checks
- typed action engine
- Gemini-first AI with Groq fallback
- durable SQLite state
- knowledge, memory and relation services
- Minecraft Java/Bedrock adapter
- moderation/security grouping
- tickets and suggestions
- durable scheduler
- analytics, recap and health
- backups and audit trail
- local owner control center

## Core safety model

`KNOW -> CHECK -> PLAN -> ACT -> VERIFY`

A message is not authorization. A role name is not authorization. AI intent is not authorization. Real Discord identity, live permissions, role hierarchy, object state and application policy are the authority.

High-risk and critical writes are previewed and confirmed. Confirmation plans are stored with target, actor, arguments, risk and expiration, then revalidated immediately before execution.

## Current feature surface

Natural-language questions can query current guild structure, Minecraft status, accessible message history, knowledge, memory, analytics, audit data, reports, tickets and relations. Natural-language actions can assign a role, lock/unlock a channel, delete a channel, change server mode, open tickets, create reports/suggestions, schedule reminders and create backups where authorized.

Legacy `sp` / `s` command compatibility remains for important existing workflows. Experimental image and YouTube automation are feature-flagged off by default.

## Installation

1. Install Node.js 22+.
2. Copy `.env.example` to `.env` and fill Discord credentials. Add Gemini and/or Groq credentials as required.
3. Run `npm install`.
4. Run `npm run migrate` only when you intentionally want to import the old `legacy/data.json` state.
5. Register commands with `npm run register`.
6. Start with `npm start`.

For rollout, set `DISCORD_GUILD_ID` so command registration is scoped to one guild first.

## Configuration

Secrets live only in environment variables. Runtime state is stored in SQLite. The owner dashboard is loopback-only by default. A non-loopback dashboard requires `DASHBOARD_TOKEN`.

The default Gemini model is the current stable `gemini-3.8-flash`; override with `GEMINI_MODEL` when needed. Model IDs remain configuration, not application logic.

## Commands

The command group is `/nethrion` with subcommands for `ask`, `smp`, `ip`, `health`, `diagnose`, `overview`, `recap`, `analytics`, `ticket`, `close-ticket`, `suggest`, `report`, `role`, `lock`, `unlock`, `purge`, `backup`, `mode`, `undo`, and `control`.

Legacy prefix examples include `sp smp`, `sp ip`, `sp role @user <role>`, `sp rolelist`, `sp lock`, `sp unlock`, `sp purge`, `sp report`, `sp ticket`, `sp suggest`, `sp recap`, `sp diagnose`, `sp backups`, `sp undo <action-id>`, and `sp ask <question>`.

## Verification status

The source tree passes the local dependency-free test suite and JavaScript syntax gate. A live Discord, Gemini, Groq, Minecraft endpoint, and clean-environment `npm install` verification still require deployment credentials/network access. The sandbox npm install attempt timed out, so no fabricated `package-lock.json` is included.

See `docs/REQUIREMENTS-TRACEABILITY.md`, `docs/FEATURE-INVENTORY.md`, `docs/ARCHITECTURE.md`, and `docs/FINAL-QUALITY-GATE.md` before public rollout.
