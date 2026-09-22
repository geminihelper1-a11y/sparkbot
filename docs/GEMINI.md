# Gemini integration

The implementation uses the current official Google Gen AI JavaScript SDK and the Interactions API shape for function calling. Tool definitions are typed schemas and are passed to Gemini; application code validates arguments again before execution.

Current implementation references checked during this build:

- Gemini models: https://ai.google.dev/gemini-api/docs/models
- Function calling: https://ai.google.dev/gemini-api/docs/function-calling
- Structured output: https://ai.google.dev/gemini-api/docs/structured-output
- Rate limits: https://ai.google.dev/gemini-api/docs/rate-limits
- Pricing: https://ai.google.dev/gemini-api/docs/pricing
- Deprecations: https://ai.google.dev/gemini-api/docs/deprecations

The default stable model is `gemini-3.8-flash` and can be overridden through `GEMINI_MODEL`. The model identifier is not hard-coded into service logic.

The agent sends minimal context and uses tool results rather than bulk database dumps. Gemini can request a tool, but the application performs authorization, target resolution and execution.

Groq uses an OpenAI-compatible HTTP function-calling path as the fallback. It shares the same typed tool registry and application action layer.

Quota handling is intentionally conservative. Counts are persisted in `ai_usage` and enforced at global, guild and user scope. A small concurrency cap prevents a message burst from turning into an uncontrolled provider spike.

Important: provider limits and data-use terms can change. The bot does not promise unlimited free AI, unlimited RPM/TPM/RPD, or unsupported privacy guarantees.
