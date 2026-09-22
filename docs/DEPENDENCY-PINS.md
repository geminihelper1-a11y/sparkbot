# Dependency pins

Direct runtime dependencies are pinned in `package.json` to reduce accidental drift:

- `discord.js` 14.27.0
- `@google/genai` 2.23.0
- `better-sqlite3` 13.0.3
- `dotenv` 18.0.1

Node.js is declared as `>=22`.

The Google SDK and current model references should be reviewed periodically because provider APIs and model availability change.

A `package-lock.json` is intentionally absent from this archive because the sandbox install timed out. Generate it with a clean `npm install` and commit it as part of the deployment repository.
