# Session 4 — Live Server Data Bridge

Spark's AI chat now uses local tool calling against the actual Discord client and the configured Minecraft status source.

## Read-only live tools
- get_smp_info — current configured Java/Bedrock IPs and ports
- get_smp_status — live Java/Bedrock server status and visible player list
- get_visible_roles — current real Discord roles, with live member counts
- get_role_members — current members of a real role (Manage Roles required)
- get_member_info — current member profile/roles for an exact Discord user
- get_visible_channels — current channels visible to the caller
- get_vc_activity — current voice rooms and activity visible to the caller
- get_server_stats — current high-level guild activity snapshot
- get_recent_suggestions — recent Spark suggestions from storage
- get_my_permissions — current caller authority

The model can call these tools when live facts are needed. Tool execution happens in Spark's application code, not inside the model. The model cannot invent tool results, grant itself authority, or see a private channel/member dataset that the tool does not return.
