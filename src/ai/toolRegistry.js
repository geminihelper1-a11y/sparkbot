// NETHRION BOT 2.0 - Typed Tool Registry & Schemas
const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const PermissionEvaluator = require('../discord/permissions');
const TargetResolver = require('../discord/targetResolver');
const minecraftService = require('../services/minecraftService');
const linkBridgeService = require('../services/linkBridgeService');
const youtubeService = require('../services/youtubeService');
const backupService = require('../services/backupService');
const ticketService = require('../services/ticketService');
const database = require('../core/database');
const { NethrionError, ErrorCodes } = require('../core/errors');

const Tools = [
  // --- INTROSPECTION & AUDIT ---
  {
    name: 'get_server_overview',
    description: 'Retrieves verified statistics about the Discord server: member counts, channels, roles, and features.',
    parameters: {
      type: 'OBJECT',
      properties: {},
      required: []
    },
    riskLevel: 'READ_ONLY',
    handler: async ({ guild }) => {
      const roles = guild.roles.cache.size;
      const channels = guild.channels.cache.size;
      const members = guild.memberCount;
      const owner = await guild.fetchOwner().catch(() => null);

      return {
        name: guild.name,
        id: guild.id,
        memberCount: members,
        channelCount: channels,
        roleCount: roles,
        owner: owner ? owner.user.tag : 'Unknown',
        createdAt: guild.createdAt.toISOString()
      };
    }
  },
  {
    name: 'get_bot_permissions',
    description: 'Inspects and reports all Discord permissions granted to NETHRION in the server and current channel.',
    parameters: {
      type: 'OBJECT',
      properties: {},
      required: []
    },
    riskLevel: 'READ_ONLY',
    handler: async ({ guild, channel }) => {
      const me = guild.members.me;
      const guildPerms = me.permissions.toArray();
      const channelPerms = channel ? channel.permissionsFor(me).toArray() : guildPerms;

      return {
        botTag: me.user.tag,
        highestRole: me.roles.highest.name,
        highestRolePosition: me.roles.highest.position,
        hasAdministrator: me.permissions.has(PermissionFlagsBits.Administrator),
        channelPermissions: channelPerms.slice(0, 15)
      };
    }
  },
  {
    name: 'diagnose_server_health',
    description: 'Runs automated diagnostics across bot permissions, SMP connection, database status, and configuration.',
    parameters: {
      type: 'OBJECT',
      properties: {},
      required: []
    },
    riskLevel: 'READ_ONLY',
    handler: async ({ guild }) => {
      const smpStatus = await minecraftService.getFullStatus();
      const ytConfig = database.get('ytConfig', {});
      const streaks = database.get('streaks', {});

      return {
        smpReachable: smpStatus.java.online || smpStatus.bedrock.online,
        smpJavaOnline: smpStatus.java.online,
        smpBedrockOnline: smpStatus.bedrock.online,
        databaseHealthy: true,
        activeStreakCount: Object.keys(streaks).length,
        youtubePollerActive: !!ytConfig.ytChannelId
      };
    }
  },

  // --- MODERATION & SERVER MANAGEMENT ---
  {
    name: 'purge_messages',
    description: 'Deletes a specified number of recent messages in the channel (1 to 100).',
    parameters: {
      type: 'OBJECT',
      properties: {
        amount: { type: 'INTEGER', description: 'Number of messages to delete (1-100)' }
      },
      required: ['amount']
    },
    requiredPermission: PermissionFlagsBits.ManageMessages,
    riskLevel: 'LOW_RISK',
    handler: async ({ channel, args }) => {
      const count = Math.max(1, Math.min(100, parseInt(args.amount, 10) || 1));
      const deleted = await channel.bulkDelete(count, true);
      return {
        messagesDeleted: deleted.size,
        channel: channel.name
      };
    }
  },
  {
    name: 'timeout_member',
    description: 'Times out a server member for a specified duration in minutes.',
    parameters: {
      type: 'OBJECT',
      properties: {
        target: { type: 'STRING', description: 'Username, nickname, mention, or snowflake ID of target member' },
        minutes: { type: 'INTEGER', description: 'Duration of timeout in minutes' },
        reason: { type: 'STRING', description: 'Reason for the moderation action' }
      },
      required: ['target', 'minutes']
    },
    requiredPermission: PermissionFlagsBits.ModerateMembers,
    riskLevel: 'LOW_RISK',
    handler: async ({ guild, callerMember, args }) => {
      const targetMember = await TargetResolver.resolveMember(guild, args.target);
      PermissionEvaluator.assertHierarchy(callerMember, targetMember, false);

      const ms = Math.max(1, parseInt(args.minutes, 10)) * 60 * 1000;
      await targetMember.timeout(ms, args.reason || 'Moderated by NETHRION');

      return {
        target: targetMember.user.tag,
        durationMinutes: args.minutes,
        reason: args.reason || 'No reason specified'
      };
    }
  },
  {
    name: 'lock_channel',
    description: 'Locks a text channel by disabling SendMessages for @everyone.',
    parameters: {
      type: 'OBJECT',
      properties: {
        channel: { type: 'STRING', description: 'Channel name, mention, or ID (defaults to current channel if blank)' }
      },
      required: []
    },
    requiredPermission: PermissionFlagsBits.ManageChannels,
    riskLevel: 'LOW_RISK',
    handler: async ({ guild, channel, args }) => {
      const targetChannel = args.channel ? TargetResolver.resolveChannel(guild, args.channel) : channel;
      await targetChannel.permissionOverwrites.edit(guild.roles.everyone, {
        SendMessages: false
      });
      return { channel: targetChannel.name, locked: true };
    }
  },
  {
    name: 'unlock_channel',
    description: 'Unlocks a text channel by restoring SendMessages for @everyone.',
    parameters: {
      type: 'OBJECT',
      properties: {
        channel: { type: 'STRING', description: 'Channel name, mention, or ID (defaults to current channel if blank)' }
      },
      required: []
    },
    requiredPermission: PermissionFlagsBits.ManageChannels,
    riskLevel: 'LOW_RISK',
    handler: async ({ guild, channel, args }) => {
      const targetChannel = args.channel ? TargetResolver.resolveChannel(guild, args.channel) : channel;
      await targetChannel.permissionOverwrites.edit(guild.roles.everyone, {
        SendMessages: null
      });
      return { channel: targetChannel.name, locked: false };
    }
  },
  {
    name: 'assign_role',
    description: 'Assigns a role to a server member after hierarchy verification.',
    parameters: {
      type: 'OBJECT',
      properties: {
        member: { type: 'STRING', description: 'Target member mention, ID, or name' },
        role: { type: 'STRING', description: 'Target role name, mention, or ID' }
      },
      required: ['member', 'role']
    },
    requiredPermission: PermissionFlagsBits.ManageRoles,
    riskLevel: 'LOW_RISK',
    handler: async ({ guild, callerMember, args }) => {
      const targetMember = await TargetResolver.resolveMember(guild, args.member);
      const targetRole = TargetResolver.resolveRole(guild, args.role);

      PermissionEvaluator.assertHierarchy(callerMember, targetRole, true);
      await targetMember.roles.add(targetRole);

      return {
        member: targetMember.user.tag,
        role: targetRole.name,
        assigned: true
      };
    },
    verify: async ({ guild, args }) => {
      const targetMember = await TargetResolver.resolveMember(guild, args.member);
      const targetRole = TargetResolver.resolveRole(guild, args.role);
      return targetMember.roles.cache.has(targetRole.id);
    }
  },
  {
    name: 'remove_role',
    description: 'Removes a role from a server member after hierarchy verification.',
    parameters: {
      type: 'OBJECT',
      properties: {
        member: { type: 'STRING', description: 'Target member mention, ID, or name' },
        role: { type: 'STRING', description: 'Target role name, mention, or ID' }
      },
      required: ['member', 'role']
    },
    requiredPermission: PermissionFlagsBits.ManageRoles,
    riskLevel: 'LOW_RISK',
    handler: async ({ guild, callerMember, args }) => {
      const targetMember = await TargetResolver.resolveMember(guild, args.member);
      const targetRole = TargetResolver.resolveRole(guild, args.role);

      PermissionEvaluator.assertHierarchy(callerMember, targetRole, true);
      await targetMember.roles.remove(targetRole);

      return {
        member: targetMember.user.tag,
        role: targetRole.name,
        removed: true
      };
    },
    verify: async ({ guild, args }) => {
      const targetMember = await TargetResolver.resolveMember(guild, args.member);
      const targetRole = TargetResolver.resolveRole(guild, args.role);
      return !targetMember.roles.cache.has(targetRole.id);
    }
  },

  // --- MINECRAFT & DISCORDSRV ---
  {
    name: 'get_smp_status',
    description: 'Pings the live Minecraft Java and Bedrock SMP server endpoints and returns real-time player counts and status.',
    parameters: {
      type: 'OBJECT',
      properties: {},
      required: []
    },
    riskLevel: 'READ_ONLY',
    handler: async () => {
      const status = await minecraftService.getFullStatus();
      return {
        java: {
          online: status.java.online,
          players: status.java.players ? status.java.players.online : 0,
          max: status.java.players ? status.java.players.max : 100,
          ip: status.config.javaHost,
          port: status.config.javaPort
        },
        bedrock: {
          online: status.bedrock.online,
          players: status.bedrock.players ? status.bedrock.players.online : 0,
          ip: status.config.bedrockHost,
          port: status.config.bedrockPort
        }
      };
    }
  },
  {
    name: 'create_smp_panel',
    description: 'Deploys an auto-updating live status embed panel for the Minecraft SMP in the specified or current channel.',
    parameters: {
      type: 'OBJECT',
      properties: {
        channel: { type: 'STRING', description: 'Channel to send the live panel in' }
      },
      required: []
    },
    requiredPermission: PermissionFlagsBits.ManageChannels,
    riskLevel: 'LOW_RISK',
    handler: async ({ guild, channel, args }) => {
      const targetChannel = args.channel ? TargetResolver.resolveChannel(guild, args.channel) : channel;
      const status = await minecraftService.getFullStatus();
      const embed = minecraftService.buildStatusEmbed(status);

      const message = await targetChannel.send({ embeds: [embed] });
      database.set('mcStatus', {
        channelId: targetChannel.id,
        messageId: message.id,
        ip: status.config.javaHost
      });

      return {
        panelChannel: targetChannel.name,
        messageId: message.id,
        deployed: true
      };
    }
  },
  {
    name: 'link_minecraft_account',
    description: 'Links a Discord user to a Minecraft IGN / UUID.',
    parameters: {
      type: 'OBJECT',
      properties: {
        ign: { type: 'STRING', description: 'Minecraft In-Game Name' }
      },
      required: ['ign']
    },
    riskLevel: 'LOW_RISK',
    handler: async ({ callerMember, args }) => {
      const link = linkBridgeService.linkAccount(callerMember.id, args.ign);
      return {
        discordTag: callerMember.user.tag,
        ign: link.ign,
        uuid: link.uuid,
        linked: true
      };
    }
  },
  {
    name: 'get_player_profile',
    description: 'Retrieves linked Minecraft profile and message streak information for a Discord user.',
    parameters: {
      type: 'OBJECT',
      properties: {
        member: { type: 'STRING', description: 'Member name, mention, or ID (defaults to self)' }
      },
      required: []
    },
    riskLevel: 'READ_ONLY',
    handler: async ({ guild, callerMember, args }) => {
      const targetMember = args.member ? await TargetResolver.resolveMember(guild, args.member) : callerMember;
      const profile = linkBridgeService.getProfile(targetMember.id);

      return {
        member: targetMember.user.tag,
        linked: profile.linked,
        ign: profile.ign,
        streak: profile.streak,
        highestStreak: profile.highestStreak
      };
    }
  },

  // --- COMMUNITY & BACKUP ---
  {
    name: 'create_backup',
    description: 'Generates an archival JSON snapshot of the server roles, channels, and permissions inside a secure ZIP file.',
    parameters: {
      type: 'OBJECT',
      properties: {},
      required: []
    },
    requiredPermission: PermissionFlagsBits.Administrator,
    riskLevel: 'LOW_RISK',
    handler: async ({ guild }) => {
      const backup = await backupService.createGuildBackup(guild);
      return {
        fileName: backup.fileName,
        sizeBytes: backup.sizeBytes,
        channelsRecorded: backup.snapshot.channels.length,
        rolesRecorded: backup.snapshot.roles.length
      };
    }
  }
];

class ToolRegistry {
  static getTools() {
    return Tools;
  }

  static getTool(name) {
    return Tools.find(t => t.name === name) || null;
  }

  /**
   * Formats tool definitions for Gemini API functionDeclarations format
   */
  static toGeminiDeclarations() {
    return Tools.map(t => ({
      name: t.name,
      description: t.description,
      parameters: t.parameters
    }));
  }

  /**
   * Formats tool definitions for Groq / OpenAI tools format
   */
  static toGroqTools() {
    return Tools.map(t => ({
      type: 'function',
      function: {
        name: t.name,
        description: t.description,
        parameters: {
          type: 'object',
          properties: Object.fromEntries(
            Object.entries(t.parameters.properties).map(([k, v]) => [
              k,
              {
                type: v.type.toLowerCase() === 'integer' ? 'integer' : 'string',
                description: v.description
              }
            ])
          ),
          required: t.parameters.required
        }
      }
    }));
  }
}

module.exports = ToolRegistry;
