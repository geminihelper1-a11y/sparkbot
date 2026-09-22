# Troubleshooting

## Bot does not connect

Verify `DISCORD_TOKEN` and `DISCORD_CLIENT_ID`. Run `npm run doctor` after dependencies are installed. Check that the bot has the intended gateway intents and Discord permissions.

## Commands are missing

Run `npm run register`. During rollout, set `DISCORD_GUILD_ID` for guild-scoped registration, then remove it for global registration when the release is stable.

## AI is unavailable

Check `GEMINI_API_KEY`. If Gemini fails and `GROQ_API_KEY` is set, the router will attempt Groq. `health` for staff shows provider health. A quota error should not be interpreted as a Discord failure.

## High-risk action will not run

Inspect the action preview. The usual causes are a stale target, missing Manage permission, bot hierarchy below the target role, an unmanageable integration role, or an expired confirmation plan.

## SMP says UNKNOWN

Check the configured host/port and the status provider. A timeout is intentionally represented as `UNKNOWN`, not automatic offline. After multiple confirmed offline checks, the monitor can create an outage transition.

## Tickets fail to open

Check the configured `ticketCategoryId` and bot permissions for channel creation and permission overwrites. If no category is configured, the ticket is created in the guild root.

## Dashboard does not start

Loopback hosts can run without a token. Any non-loopback dashboard host requires `DASHBOARD_TOKEN`.

## npm install failed in the build sandbox

A network-backed npm install timed out during this build. The source was still syntax-checked and core tests were run without external dependencies. Do a clean `npm install` on the deployment machine and commit the generated lockfile before production deployment.
