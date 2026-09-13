# Spark + DiscordSRV live profile lookup

`sp profile @user` performs a live DiscordSRV lookup on every request. It also detects accounts that were linked before Spark existed.

## 1) Spark environment variables

Set these in Railway:

```text
DISCORDSRV_CONSOLE_CHANNEL_ID=<Discord channel ID of the DiscordSRV console channel>
DISCORDSRV_CONSOLE_PREFIX=!c
DISCORDSRV_LINK_EVENT_CHANNEL_ID=<Discord channel ID where the Spark lookup responses/links are sent>
DISCORDSRV_BOT_ID=<DiscordSRV bot user ID>
```

Do not set the old `DISCORDSRV_RCON_*` variables; this build does not use RCON.

## 2) DiscordSRV config

DiscordSRV must have a dedicated console channel configured with `DiscordConsoleChannelId`. Its Discord-to-console command feature must be enabled, and the prefix must match `DISCORDSRV_CONSOLE_PREFIX` (default `!c`).

Allow the `discordsrv` command through the Discord console command whitelist. Keep the console channel private to your trusted staff/bot roles. DiscordSRV must also allow bot messages in the console channel for Spark's command to be processed.

DiscordSRV's documentation states that the console channel executes messages as server commands, and that the console-command feature uses a configurable prefix and whitelist.

## 3) alerts.yml

Keep the existing link/unlink alerts and add the live lookup alert under the single top-level `Alerts:` list:

```yaml
  - Trigger: /discordsrv linked
    Channel: linked
    Conditions:
      - '#sender.name == "CONSOLE"'
    Content: "SPARK_LOOKUP|discord_id=${#args.get(0)}|minecraft_uuid=${#discordsrv.accountLinkManager.getUuid(#args.get(0)) == null ? 'null' : #discordsrv.accountLinkManager.getUuid(#args.get(0))}|minecraft_username=${#discordsrv.accountLinkManager.getUuid(#args.get(0)) == null ? 'null' : #server.getOfflinePlayer(#discordsrv.accountLinkManager.getUuid(#args.get(0))).getName()}"
```

Here `linked` is the DiscordSRV channel name, not the visible Discord channel name. It must resolve to the Discord channel whose ID is in `DISCORDSRV_LINK_EVENT_CHANNEL_ID`.

## Result

When Spark receives:

```text
sp profile @User
```

it sends the Discord console command:

```text
!c discordsrv linked <DiscordID>
```

DiscordSRV executes the command, the command alert emits `SPARK_LOOKUP`, and Spark displays the live result.

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

This live path is independent of Spark's local link database, so pre-existing DiscordSRV links are detected too.
