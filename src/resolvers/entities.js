const { NethrionError, CODES } = require('../observability/errors');

function normalizeName(value = '') {
  return String(value).normalize('NFKC').toLowerCase().trim().replace(/[<@#&!>]/g, '').replace(/\s+/g, ' ');
}
function similarity(a, b) {
  const x = normalizeName(a), y = normalizeName(b);
  if (!x || !y) return 0;
  if (x === y) return 1;
  if (x.includes(y) || y.includes(x)) return 0.9;
  const xs = new Set(x.split(' ')); const ys = new Set(y.split(' '));
  const overlap = [...xs].filter(t => ys.has(t)).length;
  return overlap / Math.max(xs.size, ys.size);
}
function memberByExact(guild, q) {
  const raw = String(q || '').trim();
  const id = raw.match(/^<@!?(\d+)>$/)?.[1] || (/^\d{5,25}$/.test(raw) ? raw : null);
  if (id) return guild.members.cache.get(id) || null;
  const needle = normalizeName(raw.replace(/^@/, ''));
  return [...guild.members.cache.values()].find(m => normalizeName(m.user.username) === needle || normalizeName(m.displayName) === needle) || null;
}
function resolveMember(guild, q) {
  const exact = memberByExact(guild, q);
  if (exact) return { value: exact, candidates: [exact], confidence: 1 };
  const needle = normalizeName(String(q || '').replace(/^@/, ''));
  const scored = [...guild.members.cache.values()]
    .map(m => ({ value: m, score: Math.max(similarity(needle, m.user.username), similarity(needle, m.displayName)) }))
    .filter(x => x.score >= 0.75).sort((a,b)=>b.score-a.score).slice(0,4);
  if (scored.length === 1 && scored[0].score >= 0.9) return { value: scored[0].value, candidates: [scored[0].value], confidence: scored[0].score };
  return { value: null, candidates: scored.map(x => x.value), confidence: scored[0]?.score || 0 };
}
function resolveRole(guild, q) {
  const raw = String(q || '').trim();
  const id = raw.match(/^<@&?(\d+)>$/)?.[1] || (/^\d{5,25}$/.test(raw) ? raw : null);
  const needle = normalizeName(raw.replace(/^<@&?\d+>$/, '').replace(/^@/, ''));
  if (id) { const role = guild.roles.cache.get(id); if (role) return { value: role, candidates: [role], confidence: 1 }; }
  const exact = [...guild.roles.cache.values()].find(r => normalizeName(r.name) === needle);
  if (exact) return { value: exact, candidates: [exact], confidence: 1 };
  const scored = [...guild.roles.cache.values()].map(r => ({value:r,score:similarity(needle,r.name)})).filter(x=>x.score>=0.75).sort((a,b)=>b.score-a.score).slice(0,4);
  if (scored.length===1 && scored[0].score>=0.9) return {value:scored[0].value,candidates:[scored[0].value],confidence:scored[0].score};
  return {value:null,candidates:scored.map(x=>x.value),confidence:scored[0]?.score||0};
}
function resolveChannel(guild, q) {
  const raw = String(q || '').trim();
  const id = raw.match(/^<#(\d+)>$/)?.[1] || (/^\d{5,25}$/.test(raw) ? raw : null);
  if (id) { const c = guild.channels.cache.get(id); if (c) return { value: c, candidates: [c], confidence: 1 }; }
  const needle = normalizeName(raw.replace(/^#/, ''));
  const exact = [...guild.channels.cache.values()].find(c => normalizeName(c.name) === needle);
  if (exact) return { value: exact, candidates: [exact], confidence: 1 };
  const scored = [...guild.channels.cache.values()].map(c=>({value:c,score:similarity(needle,c.name)})).filter(x=>x.score>=0.75).sort((a,b)=>b.score-a.score).slice(0,4);
  if(scored.length===1&&scored[0].score>=0.9)return {value:scored[0].value,candidates:[scored[0].value],confidence:scored[0].score};
  return {value:null,candidates:scored.map(x=>x.value),confidence:scored[0]?.score||0};
}
function requireResolved(result, label) {
  if (result.value) return result.value;
  if (result.candidates?.length) throw new NethrionError(CODES.AMBIGUOUS_TARGET, `${label} is ambiguous. Please choose one exact target.`, { candidates: result.candidates.map(x => ({ id:x.id, name:x.name || x.user?.username })) });
  throw new NethrionError(CODES.INVALID_TARGET, `${label} was not found.`);
}
module.exports = { normalizeName, similarity, resolveMember, resolveRole, resolveChannel, requireResolved };
