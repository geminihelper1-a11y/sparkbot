// NETHRION BOT 2.0 - Strict Permission & Role Hierarchy Evaluator
const { PermissionFlagsBits } = require('discord.js');
const { NethrionError, ErrorCodes } = require('../core/errors');

class PermissionEvaluator {
  /**
   * Evaluates whether a member has the required Discord permission bit.
   */
  static hasPermission(member, requiredPermission) {
    if (!member) return false;
    if (member.id === member.guild.ownerId) return true;
    return member.permissions.has(requiredPermission, true);
  }

  /**
   * Asserts caller permissions, throwing a typed NethrionError if lacking.
   */
  static assertPermission(member, requiredPermission, actionName = 'this action') {
    if (!this.hasPermission(member, requiredPermission)) {
      throw new NethrionError(
        ErrorCodes.PERMISSION_DENIED,
        `User ${member.user.tag} lacking permission ${requiredPermission} for ${actionName}`,
        `You lack the required permission (${requiredPermission}) to execute ${actionName}.`
      );
    }
  }

  /**
   * Evaluates if bot has required permission in guild or channel.
   */
  static assertBotPermission(guild, requiredPermission, channel = null) {
    const botMember = guild.members.me;
    if (!botMember) {
      throw new NethrionError(ErrorCodes.BOT_LACKS_PERMISSION, 'Bot guild member not resolved.');
    }

    const perms = channel ? channel.permissionsFor(botMember) : botMember.permissions;
    if (!perms.has(requiredPermission, true)) {
      throw new NethrionError(
        ErrorCodes.BOT_LACKS_PERMISSION,
        `Bot lacks permission ${requiredPermission} in ${channel ? channel.name : guild.name}`,
        `I lack the required Discord permission (${requiredPermission}) to execute this action.`
      );
    }
  }

  /**
   * Validates role hierarchy between caller, bot, and target member or role.
   */
  static assertHierarchy(callerMember, target, isRole = false) {
    const guild = callerMember.guild;
    const botMember = guild.members.me;
    const isCallerOwner = callerMember.id === guild.ownerId;

    const callerHighest = callerMember.roles.highest.position;
    const botHighest = botMember.roles.highest.position;
    const targetPosition = isRole ? target.position : target.roles.highest.position;

    // 1. Check Caller vs Target (Owner bypasses caller check)
    if (!isCallerOwner && callerHighest <= targetPosition) {
      throw new NethrionError(
        ErrorCodes.ROLE_HIERARCHY_VIOLATION,
        `Caller ${callerMember.user.tag} (pos: ${callerHighest}) cannot manage target (pos: ${targetPosition})`,
        `Action blocked by Discord hierarchy: your role is not higher than the target.`
      );
    }

    // 2. Check Bot vs Target (Bot CANNOT bypass Discord hierarchy even if admin)
    if (botHighest <= targetPosition) {
      throw new NethrionError(
        ErrorCodes.BOT_HIERARCHY_VIOLATION,
        `Bot (pos: ${botHighest}) cannot manage target (pos: ${targetPosition})`,
        `Action blocked: my highest role is not high enough to manage this ${isRole ? 'role' : 'member'}.`
      );
    }

    return true;
  }
}

module.exports = PermissionEvaluator;
