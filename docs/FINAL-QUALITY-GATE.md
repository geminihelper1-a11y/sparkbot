# Final quality gate

## Passed in the build environment

- JavaScript syntax gate across `src`, `migration`, `scripts` and `tests`
- dependency-free core tests
- resolver ambiguity behavior
- tool argument validation
- secret redaction checks
- scheduler interval parsing
- high-risk action confirmation before execution
- source tree separation from legacy code
- configuration validation and environment-only secret design

## Required before public deployment

1. Clean machine: `npm install` and commit the generated `package-lock.json`.
2. Register slash commands in a staging guild.
3. Login the bot with production-equivalent intents and permissions.
4. Test role assignment against same-level, higher-level and managed roles.
5. Test lock/unlock and deletion previews, including stale-plan rejection.
6. Test undo with changed target state.
7. Test history search with accessible and inaccessible channels.
8. Test ticket creation/closure with and without category configuration.
9. Test Gemini function calling and tool-result continuation with the configured model.
10. Disable Gemini and confirm Groq fallback; disable both and confirm deterministic features remain usable.
11. Exercise quota limits and provider failure states.
12. Break the Minecraft endpoint temporarily and verify UNKNOWN rather than false offline.
13. Confirm outage/recovery alerts produce one incident and one recovery.
14. Restart the process while jobs are pending and confirm durable scheduling/run dedupe.
15. Create and inspect a backup; verify its SQLite snapshot can be opened.
16. Run adversarial language tests: typos, fake admin claims, quoted instructions, hypothetical questions, ambiguous role names and private-data requests.
17. Review every public bot response for truthful state and readable English.

A successful start or compile is not the finish line. The real gate is a clean installation plus a controlled-guild behavioral test.
