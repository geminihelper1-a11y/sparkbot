// NETHRION BOT 2.0 - Central Action & Verification Pipeline
// Principle: KNOW -> CHECK -> PLAN -> ACT -> VERIFY
const { PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const PermissionEvaluator = require('./permissions');
const TargetResolver = require('./targetResolver');
const logger = require('../core/logger');
const { NethrionError, ErrorCodes } = require('../core/errors');

class ActionEngine {
  constructor() {
    this.pendingConfirmations = new Map();
  }

  /**
   * Dispatches a high-risk or standard tool action through the pipeline.
   */
  async execute({ guild, callerMember, toolDefinition, args, channel = null }) {
    const actionId = `ACT_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

    logger.info('ACTION_ENGINE', `[PLAN] Initiating ${toolDefinition.name}`, {
      actionId,
      caller: callerMember.user.tag,
      riskLevel: toolDefinition.riskLevel,
      args
    });

    // 1. CHECK: Verify permissions
    if (toolDefinition.requiredPermission) {
      PermissionEvaluator.assertPermission(callerMember, toolDefinition.requiredPermission, toolDefinition.name);
      PermissionEvaluator.assertBotPermission(guild, toolDefinition.requiredPermission, channel);
    }

    // 2. CHECK: Confirmation Gate for HIGH_RISK actions
    if (toolDefinition.riskLevel === 'HIGH_RISK_CONFIRM' && !args._confirmed) {
      return {
        status: 'CONFIRMATION_REQUIRED',
        actionId,
        toolName: toolDefinition.name,
        prompt: toolDefinition.getConfirmationPrompt ? toolDefinition.getConfirmationPrompt(args) : `Are you sure you want to execute ${toolDefinition.name}?`,
        args
      };
    }

    // 3. ACT: Execute the tool implementation
    let result;
    try {
      result = await toolDefinition.handler({
        guild,
        callerMember,
        args,
        channel,
        actionEngine: this
      });
    } catch (err) {
      logger.error('ACTION_ENGINE', `[FAILED] Execution error in ${toolDefinition.name}`, {
        actionId,
        error: err.message
      });
      return {
        status: 'FAILED',
        error: err.publicMessage || err.message,
        code: err.code || ErrorCodes.ACTION_BLOCKED
      };
    }

    // 4. VERIFY: Post-execution live state verification
    if (toolDefinition.verify) {
      const verified = await toolDefinition.verify({ guild, args, result });
      if (!verified) {
        logger.warn('ACTION_ENGINE', `[VERIFY_FAILED] State verification failed for ${toolDefinition.name}`, { actionId });
        return {
          status: 'PARTIAL',
          message: 'Operation was dispatched, but post-execution state verification failed or timed out.',
          result
        };
      }
    }

    logger.info('ACTION_ENGINE', `[SUCCESS] ${toolDefinition.name} verified and complete.`, { actionId });
    return {
      status: 'SUCCESS',
      result,
      actionId
    };
  }
}

const actionEngine = new ActionEngine();
module.exports = actionEngine;
