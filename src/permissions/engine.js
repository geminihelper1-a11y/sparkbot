const { PermissionFlagsBits } = require('discord.js');
const { NethrionError, CODES } = require('../observability/errors');

function hasGuildPermission(member, permission) {
  return Boolean(member?.permissions?.has?.(permission));
}

function canManageGuild(member, guild) {
  return guild?.ownerId === member?.id || hasGuildPermission(member, PermissionFlagsBits.Administrator) || hasGuildPermission(member, PermissionFlagsBits.ManageGuild);
}

function botMember(guild) {
  return guild?.members?.me || null;
}

function checkBotCanRole(guild, targetRole) {
  const me = botMember(guild);
  if (!me) throw new NethrionError(CODES.MISSING_PERMISSION, 'I cannot determine my current Discord role hierarchy.');
  if (targetRole?.managed) throw new NethrionError(CODES.MANAGED_ROLE, 'That role is managed by Discord or an integration and cannot be assigned directly.');
  if (!me.permissions.has(PermissionFlagsBits.ManageRoles)) throw new NethrionError(CODES.MISSING_PERMISSION, 'My bot role is missing Manage Roles.');
  if (me.roles.highest.position <= targetRole.position) throw new NethrionError(CODES.HIERARCHY_BLOCK, 'My highest role is not above the target role.');
}

function checkActionAuthorization({ member, guild, action, targetRole }) {
  if (!canManageGuild(member, guild) && !hasGuildPermission(member, action.requiredPermission)) {
    throw new NethrionError(CODES.MISSING_PERMISSION, `${permissionLabel(action.requiredPermission)} permission required.`);
  }
  if (targetRole) {
    const actorHighest = member?.roles?.highest?.position ?? 0;
    if (guild.ownerId !== member.id && targetRole.position >= actorHighest) {
      throw new NethrionError(CODES.HIERARCHY_BLOCK, 'You cannot manage a role at or above your highest role.');
    }
    checkBotCanRole(guild, targetRole);
  }
  return { authorized: true, actorId: member.id, requiredPermission: action.requiredPermission || null };
}

function permissionLabel(flag) {
  const map = new Map(Object.entries(PermissionFlagsBits).map(([k, v]) => [String(v), k.replace(/([a-z])([A-Z])/g, '$1 $2')]));
  return map.get(String(flag)) || 'Required Discord';
}

function explainEffectiveChannelAccess(member, channel, permissionName) {
  const permission = String(permissionName || '').trim();
  if (!permission) return { state: 'UNKNOWN', allowed: false, reason: 'Permission name is required.' };
  const permissionBit = PermissionFlagsBits[permission];
  if (!permissionBit) return { state: 'UNKNOWN', allowed: false, reason: `Unknown Discord permission: ${permission}.` };
  try {
    const perms = channel.permissionsFor(member);
    const allowed = Boolean(perms?.has(permissionBit));
    return {
      state: 'SUCCESS',
      allowed,
      permission,
      channelId: channel.id,
      userId: member.id,
      source: 'live Discord effective permissions'
    };
  } catch (e) {
    return { state: 'UNKNOWN', allowed: false, permission, reason: e.message };
  }
}

module.exports = { hasGuildPermission, canManageGuild, checkBotCanRole, checkActionAuthorization, explainEffectiveChannelAccess, permissionLabel };
