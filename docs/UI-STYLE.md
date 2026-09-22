# NETHRION Public UI Contract

NETHRION public replies are intentionally compact. Live tool results are never sent directly to Discord as JSON.

## Rules

- Answer directly; do not add routine greetings to non-greeting questions.
- Use normal Discord text with short headings and readable labels.
- Hide internal IDs, provider names, raw API payloads, database-shaped objects, evidence metadata, permissions, and timestamps unless the user explicitly needs a safe public value.
- Use one formatter for each result class so slash commands, prefix commands, and natural-language tools present the same answer.
- High-impact actions use a short confirmation preview with a human target name, not serialized target objects.
- Unknown, blocked, partial, and failed states are stated explicitly.

## Examples

`get_server_overview` → `NETHRION has 99 members, 32 roles and 60 channels.`

`get_smp_status` → `Java — Offline · 0/0 players` and `Bedrock — Offline · 0/0 players`

`get_server_overview` must never become a raw JSON block in a public channel.

## Panel behavior
Panel commands are functional commands, not placeholders. `sp smp-panel` creates or refreshes a live SMP panel in the current channel. `sp ticket-panel`, `sp roles-panel`, and `sp anon-panel` create their respective interactive panels. Public panel messages never expose raw tool JSON, internal IDs, implementation notes, or setup-only text.
