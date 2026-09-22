const CODES = Object.freeze({
  INVALID_TARGET:'INVALID_TARGET', AMBIGUOUS_TARGET:'AMBIGUOUS_TARGET', MISSING_PERMISSION:'MISSING_PERMISSION', HIERARCHY_BLOCK:'HIERARCHY_BLOCK', MANAGED_ROLE:'MANAGED_ROLE', CHANNEL_ACCESS_DENIED:'CHANNEL_ACCESS_DENIED', CONFIRMATION_REQUIRED:'CONFIRMATION_REQUIRED', CONFIRMATION_EXPIRED:'CONFIRMATION_EXPIRED', STALE_PLAN:'STALE_PLAN', VERIFY_FAILED:'VERIFY_FAILED', RATE_LIMIT:'RATE_LIMIT', PROVIDER_UNAVAILABLE:'PROVIDER_UNAVAILABLE', PROVIDER_QUOTA:'PROVIDER_QUOTA', INVALID_TOOL_ARGS:'INVALID_TOOL_ARGS', UNKNOWN_TOOL:'UNKNOWN_TOOL', DATABASE_UNAVAILABLE:'DATABASE_UNAVAILABLE', EXTERNAL_TIMEOUT:'EXTERNAL_TIMEOUT', UNKNOWN:'UNKNOWN'
});
class NethrionError extends Error { constructor(code,message,meta={}) { super(message); this.code=code; this.meta=meta; this.name='NethrionError'; } }
function normalizeError(err, fallbackCode=CODES.UNKNOWN) {
  if (err instanceof NethrionError) return err;
  const msg=String(err?.message||err);
  const lower=msg.toLowerCase();
  if (/429|rate limit|resource exhausted|quota/.test(lower)) return new NethrionError(CODES.RATE_LIMIT,msg);
  if (/permission|missing access/.test(lower)) return new NethrionError(CODES.MISSING_PERMISSION,msg);
  if (/hierarch|role.*above|highest role/.test(lower)) return new NethrionError(CODES.HIERARCHY_BLOCK,msg);
  if (/timeout|timed out|abort/.test(lower)) return new NethrionError(CODES.EXTERNAL_TIMEOUT,msg);
  return new NethrionError(fallbackCode,msg);
}
module.exports = { CODES,NethrionError,normalizeError };
