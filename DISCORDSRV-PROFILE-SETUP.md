# Spark + DiscordSRV live profile lookup

`sp profile @user` now asks DiscordSRV for the live link status every time. This is not limited to links created after Spark was installed.

## 1) Keep the existing event bridge

Your existing `alerts.yml` linked/unlinked alerts can stay in place:

```yaml
- Trigger: github.scarsz.discordsrv.api.events.AccountLinkedEvent
  Channel: linked
  Content: "SPARK_LINK|event=linked|discord_id=${#event.getUser().getId()}|minecraft_uuid=${#event.getPlayer().getUniqueId()}|minecraft_username={username}"

- Trigger: github.scarsz.discordsrv.api.events.AccountUnlinkedEvent
  Channel: linked
  Content: "SPARK_LINK|event=unlinked|discord_id=${#event.getDiscordUser().getId()}|minecraft_uuid=${#event.getPlayer().getUniqueId()}|minecraft_username={username}"
```

`linked` must be a configured DiscordSRV channel name. Set the matching Discord channel ID in Spark as `DISCORDSRV_LINK_EVENT_CHANNEL_ID`.

## 2) Add a live lookup alert to DiscordSRV `alerts.yml`

Put this under `Alerts:`:

```yaml
  - Trigger: /discordsrv linked
    Channel: linked
    Conditions:
      - '#sender.name == "CONSOLE"'
    Content: "SPARK_LOOKUP|discord_id=${#args.get(0)}|minecraft_uuid=${#discordsrv.accountLinkManager.getUuid(#args.get(0)) == null ? 'null' : #discordsrv.accountLinkManager.getUuid(#args.get(0))}|minecraft_username=${#discordsrv.accountLinkManager.getUuid(#args.get(0)) == null ? 'null' : #server.getOfflinePlayer(#discordsrv.accountLinkManager.getUuid(#args.get(0))).getName()}"
```

This uses DiscordSRV's own account-link manager for the lookup. DiscordSRV's `linked` command supports a Discord ID target, and its command implementation uses `accountLinkManager.getUuid(target)` for that direction.

If your server exposes the `/discord` alias rather than `/discordsrv` for alert triggering, add the same alert with:

```yaml
  - Trigger: /discord linked
    Channel: linked
    Conditions:
      - '#sender.name == "CONSOLE"'
    Content: "SPARK_LOOKUP|discord_id=${#args.get(0)}|minecraft_uuid=${#discordsrv.accountLinkManager.getUuid(#args.get(0)) == null ? 'null' : #discordsrv.accountLinkManager.getUuid(#args.get(0))}|minecraft_username=${#discordsrv.accountLinkManager.getUuid(#args.get(0)) == null ? 'null' : #server.getOfflinePlayer(#discordsrv.accountLinkManager.getUuid(#args.get(0))).getName()}"
```

## 3) Enable RCON on the Minecraft server

Spark is running remotely on Railway, so it needs a secure way to ask the Minecraft server to perform the DiscordSRV lookup. Set these Railway variables:

```text
DISCORDSRV_RCON_HOST=<minecraft-server-host>
DISCORDSRV_RCON_PORT=25575
DISCORDSRV_RCON_PASSWORD=<strong-rcon-password>
DISCORDSRV_LINK_EVENT_CHANNEL_ID=<discord-link-channel-id>
DISCORDSRV_BOT_ID=<DiscordSRV-bot-user-id>
```

Use the actual RCON port/password configured by your Minecraft host.

## Result

Now:

```text
sp profile @User
```

does a live DiscordSRV lookup.

Linked:
```text
DiscordSRV  ✅ Linked
Minecraft    `PlayerName`
```

Not linked:
```text
DiscordSRV  ❌ Not linked
Minecraft    `Not linked`
```

If the live bridge is unreachable, Spark does not pretend the user is unlinked; it shows that the DiscordSRV check is unavailable and may show a cached link as a fallback.

