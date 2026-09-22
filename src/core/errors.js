// NETHRION BOT 2.0 - Canonical Error Codes and Safe Explanations
class NethrionError extends Error {
  constructor(code, message, publicMessage = null, details = null) {
    super(message);
    this.name = 'NethrionError';
    this.code = code;
    this.publicMessage = publicMessage || message;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
}

const ErrorCodes = {
  // Authorization & Permissions
  PERMISSION_DENIED: 'ERR_PERMISSION_DENIED',
  ROLE_HIERARCHY_VIOLATION: 'ERR_ROLE_HIERARCHY',
  BOT_LACKS_PERMISSION: 'ERR_BOT_LACKS_PERMISSION',
  BOT_HIERARCHY_VIOLATION: 'ERR_BOT_HIERARCHY',
  OWNER_ONLY: 'ERR_OWNER_ONLY',
  STAFF_ONLY: 'ERR_STAFF_ONLY',

  // Target Resolution
  TARGET_NOT_FOUND: 'ERR_TARGET_NOT_FOUND',
  TARGET_AMBIGUOUS: 'ERR_TARGET_AMBIGUOUS',
  INVALID_ARGUMENT: 'ERR_INVALID_ARGUMENT',

  // Action Pipeline
  ACTION_BLOCKED: 'ERR_ACTION_BLOCKED',
  CONFIRMATION_REQUIRED: 'ERR_CONFIRMATION_REQUIRED',
  VERIFICATION_FAILED: 'ERR_VERIFICATION_FAILED',
  RATE_LIMITED: 'ERR_RATE_LIMITED',

  // AI & External Providers
  AI_PROVIDER_ERROR: 'ERR_AI_PROVIDER',
  AI_RATE_LIMITED: 'ERR_AI_RATE_LIMITED',
  IMAGE_GENERATION_FAILED: 'ERR_IMAGE_GENERATION',

  // Subsystems
  MINECRAFT_UNREACHABLE: 'ERR_MINECRAFT_UNREACHABLE',
  YOUTUBE_FETCH_FAILED: 'ERR_YOUTUBE_FETCH',
  BACKUP_FAILED: 'ERR_BACKUP_FAILED',
  DATABASE_IO_ERROR: 'ERR_DATABASE_IO'
};

const UserMessages = {
  [ErrorCodes.PERMISSION_DENIED]: 'You do not have permission to perform this action.',
  [ErrorCodes.ROLE_HIERARCHY_VIOLATION]: 'Action blocked by Discord role hierarchy: your role is not high enough.',
  [ErrorCodes.BOT_LACKS_PERMISSION]: 'I do not have the required Discord permission to perform this action.',
  [ErrorCodes.BOT_HIERARCHY_VIOLATION]: 'I cannot modify this target because my highest role is below or equal to it.',
  [ErrorCodes.TARGET_NOT_FOUND]: 'Target not found. Please verify the ID, mention, or exact name.',
  [ErrorCodes.TARGET_AMBIGUOUS]: 'Found multiple close matches. Please specify the exact name or snowflake ID.',
  [ErrorCodes.INVALID_ARGUMENT]: 'Invalid parameters provided for this action.',
  [ErrorCodes.VERIFICATION_FAILED]: 'Action was dispatched, but post-execution state verification failed.',
  [ErrorCodes.RATE_LIMITED]: 'Action temporarily throttled to comply with Discord rate limits.',
  [ErrorCodes.AI_RATE_LIMITED]: 'AI service is currently rate limited. Please try again in a few moments.',
  [ErrorCodes.MINECRAFT_UNREACHABLE]: 'Could not connect to the Minecraft SMP server endpoint.'
};

module.exports = {
  NethrionError,
  ErrorCodes,
  UserMessages
};
