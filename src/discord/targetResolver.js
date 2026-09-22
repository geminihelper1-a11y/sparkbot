// NETHRION BOT 2.0 - Conservative Target Resolver
const { NethrionError, ErrorCodes } = require('../core/errors');

class TargetResolver {
  /**
   * Calculate normalized string similarity (0.0 to 1.0)
   */
  static similarity(s1, s2) {
    const a = s1.toLowerCase().trim();
    const b = s2.toLowerCase().trim();
    if (a === b) return 1.0;
    if (a.length === 0 || b.length === 0) return 0.0;
    if (a.includes(b) || b.includes(a)) {
      return Math.min(a.length, b.length) / Math.max(a.length, b.length);
    }

    // Levenshtein distance
    const track = Array(b.length + 1).fill(null).map(() =>
      Array(a.length + 1).fill(null));
    for (let i = 0; i <= a.length; i += 1) track[0][i] = i;
    for (let j = 0; j <= b.length; j += 1) track[j][0] = j;

    for (let j = 1; j <= b.length; j += 1) {
      for (let i = 1; i <= a.length; i += 1) {
        const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
        track[j][i] = Math.min(
          track[j][i - 1] + 1,
          track[j - 1][i] + 1,
          track[j - 1][i - 1] + indicator
        );
      }
    }

    const dist = track[b.length][a.length];
    return 1 - (dist / Math.max(a.length, b.length));
  }

  /**
   * Resolves a GuildMember by ID, Mention, or Name
   */
  static async resolveMember(guild, input) {
    if (!input || typeof input !== 'string') {
      throw new NethrionError(ErrorCodes.INVALID_ARGUMENT, 'Member search input cannot be empty.');
    }

    const cleanInput = input.trim();

    // 1. Check Mention <@!12345> or <@12345>
    const mentionMatch = cleanInput.match(/^<@!?(\d+)>$/);
    const id = mentionMatch ? mentionMatch[1] : (cleanInput.match(/^\d{17,20}$/) ? cleanInput : null);

    if (id) {
      try {
        const member = await guild.members.fetch(id);
        if (member) return member;
      } catch (e) {
        // Not found by ID, proceed to name match
      }
    }

    // 2. Exact match on username or nickname
    await guild.members.fetch({ limit: 100 }).catch(() => {});
    const members = Array.from(guild.members.cache.values());
    const lower = cleanInput.toLowerCase();

    const exact = members.find(m =>
      m.user.username.toLowerCase() === lower ||
      m.user.tag.toLowerCase() === lower ||
      (m.nickname && m.nickname.toLowerCase() === lower)
    );
    if (exact) return exact;

    // 3. Conservative Levenshtein fuzzy match
    const scored = members.map(m => {
      const uSim = this.similarity(lower, m.user.username);
      const nSim = m.nickname ? this.similarity(lower, m.nickname) : 0;
      return { member: m, score: Math.max(uSim, nSim) };
    }).filter(x => x.score >= 0.75);

    scored.sort((a, b) => b.score - a.score);

    if (scored.length === 0) {
      throw new NethrionError(ErrorCodes.TARGET_NOT_FOUND, `Could not find member matching: "${input}"`);
    }

    // Stop if top 2 candidates are too close in score (ambiguity protection)
    if (scored.length > 1 && (scored[0].score - scored[1].score) < 0.15) {
      const candidates = scored.slice(0, 3).map(c => `${c.member.user.tag} (${c.member.id})`).join(', ');
      throw new NethrionError(
        ErrorCodes.TARGET_AMBIGUOUS,
        `Ambiguous member query for "${input}". Candidates: ${candidates}`,
        `Multiple members match "${input}": ${candidates}. Please provide the exact user ID or mention.`
      );
    }

    return scored[0].member;
  }

  /**
   * Resolves a Role by ID, Mention, or Name
   */
  static resolveRole(guild, input) {
    if (!input || typeof input !== 'string') {
      throw new NethrionError(ErrorCodes.INVALID_ARGUMENT, 'Role search input cannot be empty.');
    }

    const cleanInput = input.trim();
    const mentionMatch = cleanInput.match(/^<@&(\d+)>$/);
    const id = mentionMatch ? mentionMatch[1] : (cleanInput.match(/^\d{17,20}$/) ? cleanInput : null);

    if (id) {
      const role = guild.roles.cache.get(id);
      if (role) return role;
    }

    const roles = Array.from(guild.roles.cache.values());
    const lower = cleanInput.toLowerCase();

    // Exact name match
    const exact = roles.find(r => r.name.toLowerCase() === lower);
    if (exact) return exact;

    // Conservative fuzzy match
    const scored = roles.map(r => ({
      role: r,
      score: this.similarity(lower, r.name)
    })).filter(x => x.score >= 0.75);

    scored.sort((a, b) => b.score - a.score);

    if (scored.length === 0) {
      throw new NethrionError(ErrorCodes.TARGET_NOT_FOUND, `Could not find role matching: "${input}"`);
    }

    if (scored.length > 1 && (scored[0].score - scored[1].score) < 0.15) {
      const candidates = scored.slice(0, 3).map(c => `@${c.role.name} (${c.role.id})`).join(', ');
      throw new NethrionError(
        ErrorCodes.TARGET_AMBIGUOUS,
        `Ambiguous role query for "${input}". Candidates: ${candidates}`,
        `Multiple roles match "${input}": ${candidates}. Please provide the exact role ID.`
      );
    }

    return scored[0].role;
  }

  /**
   * Resolves a Channel by ID, Mention, or Name
   */
  static resolveChannel(guild, input) {
    if (!input || typeof input !== 'string') {
      throw new NethrionError(ErrorCodes.INVALID_ARGUMENT, 'Channel search input cannot be empty.');
    }

    const cleanInput = input.trim();
    const mentionMatch = cleanInput.match(/^<#(\d+)>$/);
    const id = mentionMatch ? mentionMatch[1] : (cleanInput.match(/^\d{17,20}$/) ? cleanInput : null);

    if (id) {
      const channel = guild.channels.cache.get(id);
      if (channel) return channel;
    }

    const channels = Array.from(guild.channels.cache.values());
    const lower = cleanInput.replace(/^#/, '').toLowerCase();

    const exact = channels.find(c => c.name.toLowerCase() === lower);
    if (exact) return exact;

    const scored = channels.map(c => ({
      channel: c,
      score: this.similarity(lower, c.name)
    })).filter(x => x.score >= 0.75);

    scored.sort((a, b) => b.score - a.score);

    if (scored.length === 0) {
      throw new NethrionError(ErrorCodes.TARGET_NOT_FOUND, `Could not find channel matching: "${input}"`);
    }

    return scored[0].channel;
  }
}

module.exports = TargetResolver;
