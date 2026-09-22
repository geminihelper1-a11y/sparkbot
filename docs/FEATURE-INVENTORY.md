# Legacy feature inventory

The supplied SparkBot archive was inventoried before rebuild. The legacy project was centered around a roughly 4,003-line `index.js`, JSON persistence and multiple event/listener paths. The rebuild preserves useful behavior through service boundaries instead of copying that monolithic shape.

| Legacy capability | New home | Status |
|---|---|---|
| Gemini/Groq chat | `src/ai/*` | Rebuilt |
| Natural actions | `src/ai/agent.js`, `src/actions/*` | Rebuilt |
| Live Discord status/overview | `src/discord/service.js` | Rebuilt |
| Java/Bedrock status | `src/minecraft/status.js` | Rebuilt |
| Discord/Minecraft linking | DB table + Minecraft service boundary | Core storage retained; live linking command remains in compatibility layer |
| Tickets | `src/tickets/service.js` | Rebuilt core/private lifecycle |
| Reports | `reports` table + tool/command | Rebuilt |
| Suggestions | `src/suggestions/service.js` | Rebuilt core + grouping |
| Roles | resolver + action engine | Rebuilt |
| Lock/unlock | action engine | Rebuilt with confirmation |
| Purge | action engine | Rebuilt with confirmation |
| Tasks/reminders | durable scheduler | Rebuilt |
| Summaries/recap | `src/recap/service.js` | Rebuilt structured core |
| Cases | schema retained; detailed case UI deferred | Deferred |
| Backups | `src/backups/service.js` | Rebuilt |
| YouTube alerts | feature flag + compatibility placeholder | Disabled by default |
| Image generation | feature flag + compatibility placeholder | Disabled by default |
| Diagnosis | `src/health/service.js` | Rebuilt |
| Message/member history search | `src/discord/service.js` | Rebuilt/bounded |
| Audit log access | staff tool | Rebuilt |
| Bot permission diagnostics | `src/discord/service.js` | Core API retained |
| Role fuzzy matching | `src/resolvers/entities.js` | Rebuilt conservatively |
| Role panels / repeated panels | panel table + control surface | Core storage; panel authoring intentionally centralized |
| Anonymous board | legacy-only compatibility area | Not promoted to public v2 core |
| Streaks | schema + compatibility command | Preserved |
| Voice role/automation | legacy inventory only | Deferred until separately tested |
| Giveaway/poll/starboard/leveling extras | legacy inventory only | Deferred; not part of v2 public core |
| Custom commands/autoresponders | legacy inventory only | Deferred to avoid feature explosion |

Data migration imports validated legacy JSON records for SMP config, streaks, Discord/Minecraft links, reports, memory and legacy task metadata. Corrupt JSON aborts without destructive changes; a timestamped source copy is written before migration.
