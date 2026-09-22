// NETHRION BOT 2.0 - Intelligent AI Router (Gemini Primary + Groq Fallback)
const geminiProvider = require('./geminiProvider');
const groqProvider = require('./groqProvider');
const logger = require('../core/logger');

class AIRouter {
  /**
   * Routes chat interaction through Gemini primary, falling back to Groq if rate limited or failing
   */
  async handleChat(params) {
    if (geminiProvider.isAvailable()) {
      try {
        logger.debug('AI_ROUTER', 'Dispatching interaction to Gemini 2.0...');
        return await geminiProvider.processInteraction(params);
      } catch (err) {
        logger.warn('AI_ROUTER', 'Gemini returned error, attempting Groq fallback...', { error: err.message });
        if (groqProvider.isAvailable()) {
          try {
            return await groqProvider.processInteraction(params);
          } catch (groqErr) {
            logger.error('AI_ROUTER', 'Groq fallback also failed', { error: groqErr.message });
          }
        }
        return {
          reply: 'I encountered an upstream AI service error. Please try again shortly.',
          error: err.message
        };
      }
    } else if (groqProvider.isAvailable()) {
      logger.debug('AI_ROUTER', 'Gemini not configured, routing to Groq...');
      return await groqProvider.processInteraction(params);
    } else {
      return {
        reply: 'AI reasoning is currently in offline mode (no API key configured). Slash commands and direct tools remain fully operational.',
        offline: true
      };
    }
  }
}

const aiRouter = new AIRouter();
module.exports = aiRouter;
