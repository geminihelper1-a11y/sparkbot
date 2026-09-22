# Role matching update

Spark now resolves role names independently of cosmetic Discord styling and common human typos.

Accepted without requiring the exact decorated name include differences in:
- capitalization
- emojis and symbols
- brackets/separators
- spaces/hyphens/underscores
- common typos and transposed characters
- simple word-order/formatting differences

Examples:
- `Media`
- `📸 【 MEDIA 】`
- `media`
- `medai`
- `midea`

The resolver still refuses to guess when two roles are too close. In that case it returns the closest candidates instead of assigning the wrong role.

Role mentions remain the strongest and safest form: `<@&ROLE_ID>`.
