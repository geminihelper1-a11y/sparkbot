# DiscordSRV -> Spark account-link bridge

Spark runs on Railway and cannot directly read DiscordSRV's Java/JVM account-link manager. To make `sp profile` show the real Minecraft account, configure DiscordSRV to emit its `AccountLinkedEvent` / `AccountUnlinkedEvent` into a channel Spark can read.

Preferred alert content (one line):

`SPARK_LINK|event=linked|discord_id=${#event.getUser().getId()}|minecraft_uuid=${#event.getPlayer().getUniqueId()}|minecraft_username={username}`

For an unlink event use:

`SPARK_LINK|event=unlinked|discord_id=${#event.getUser().getId()}|minecraft_uuid=${#event.getPlayer().getUniqueId()}|minecraft_username={username}`

Set these Railway variables if you use a dedicated link-event channel:

`DISCORDSRV_LINK_EVENT_CHANNEL_ID=<channel id>`
`DISCORDSRV_BOT_ID=<DiscordSRV bot user id>`

Both are optional, but using both is strongly recommended. They prevent unrelated messages from becoming link records.

Once the event is received, Spark stores the real Discord ID -> Minecraft username/UUID mapping with `source: DiscordSRV`. `sp profile` will then show that linked account. Unlink events remove the mapping.
