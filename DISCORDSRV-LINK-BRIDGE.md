# DiscordSRV -> Spark account-link bridge

Spark runs remotely (for example on Railway), so it cannot directly call DiscordSRV's Java account-link manager.

## Event bridge

Keep these alerts for future link/unlink changes:

```yaml
- Trigger: github.scarsz.discordsrv.api.events.AccountLinkedEvent
  Channel: linked
  Content: "SPARK_LINK|event=linked|discord_id=${#event.getUser().getId()}|minecraft_uuid=${#event.getPlayer().getUniqueId()}|minecraft_username={username}"

- Trigger: github.scarsz.discordsrv.api.events.AccountUnlinkedEvent
  Channel: linked
  Content: "SPARK_LINK|event=unlinked|discord_id=${#event.getDiscordUser().getId()}|minecraft_uuid=${#event.getPlayer().getUniqueId()}|minecraft_username={username}"
```

## Live lookup

For `sp profile`, Spark does not rely on these events. It sends `!c discordsrv linked <DiscordID>` into the DiscordSRV console channel, and the `alerts.yml` command alert returns a machine-readable `SPARK_LOOKUP` response.

Required Spark variables:

```text
DISCORDSRV_CONSOLE_CHANNEL_ID=<console channel id>
DISCORDSRV_CONSOLE_PREFIX=!c
DISCORDSRV_LINK_EVENT_CHANNEL_ID=<link-event channel id>
DISCORDSRV_BOT_ID=<DiscordSRV bot id>
```

This makes `sp profile` authoritative against the current DiscordSRV account-link database, including links that existed before Spark was installed.
