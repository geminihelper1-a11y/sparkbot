# Minecraft bridge

The Minecraft service normalizes Java and Bedrock status into one shape containing edition, host, port, status, player count where available, version, latency, source and `checkedAt`.

Supported status states are `ONLINE`, `OFFLINE`, `UNKNOWN` and `NOT_CONFIGURED`.

Transport timeout or malformed provider data is not silently converted to offline. Offline/online incident transitions require an observed status change from a previous normalized state.

Default endpoints are stored as safe configuration defaults only. Current live values should be set in the owner configuration surface or environment.

The adapter boundary is deliberate: provider-specific JSON is handled in `src/minecraft/status.js`; other NETHRION services consume the normalized object.

The runtime creates a durable one-minute SMP monitor job. Outage and recovery alerts are transition-based so one timeout does not produce repeated public spam.
