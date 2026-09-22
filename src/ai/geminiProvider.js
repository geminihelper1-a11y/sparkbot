// NETHRION BOT 2.0 - Official Google Gen AI Provider
const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('../core/config');
const logger = require('../core/logger');
const ToolRegistry = require('./toolRegistry');
const PromptBuilder = require('./promptBuilder');
const actionEngine = require('../discord/actionEngine');

class GeminiProvider {
  constructor() {
    this.client = null;
    this.modelName = config.ai.geminiModel;
    if (config.ai.geminiKey) {
      try {
        this.client = new GoogleGenerativeAI(config.ai.geminiKey);
      } catch (err) {
        logger.error('GEMINI', 'Failed to initialize Gemini SDK client', { error: err.message });
      }
    }
  }

  isAvailable() {
    return !!this.client;
  }

  /**
   * Processes user message through Gemini with function calling
   */
  async processInteraction({ message, guild, callerMember, channel, history = [] }) {
    if (!this.isAvailable()) {
      throw new Error('Gemini API key is not configured');
    }

    const systemPrompt = PromptBuilder.buildSystemPrompt(guild, callerMember.user);
    const model = this.client.getGenerativeModel({
      model: this.modelName,
      systemInstruction: systemPrompt
    });

    const geminiTools = [
      {
        functionDeclarations: ToolRegistry.toGeminiDeclarations()
      }
    ];

    const chat = model.startChat({
      tools: geminiTools
    });

    // Send user message
    const result = await chat.sendMessage(message.content);
    const response = result.response;
    const calls = response.functionCalls();

    if (!calls || calls.length === 0) {
      // Model answered directly without tools
      return {
        reply: response.text(),
        toolUsed: null
      };
    }

    // Execute tool call via ActionEngine
    const call = calls[0];
    const toolDef = ToolRegistry.getTool(call.name);

    if (!toolDef) {
      return {
        reply: `Selected tool "${call.name}" is not registered.`,
        toolUsed: call.name
      };
    }

    const actionResult = await actionEngine.execute({
      guild,
      callerMember,
      toolDefinition: toolDef,
      args: call.args,
      channel
    });

    // If confirmation is required, return prompt directly
    if (actionResult.status === 'CONFIRMATION_REQUIRED') {
      return {
        reply: actionResult.prompt,
        toolUsed: call.name,
        requiresConfirmation: true,
        actionId: actionResult.actionId
      };
    }

    // Feed tool output back to model for synthesized final response
    const secondTurn = await chat.sendMessage([
      {
        functionResponse: {
          name: call.name,
          response: { result: actionResult }
        }
      }
    ]);

    return {
      reply: secondTurn.response.text(),
      toolUsed: call.name,
      actionResult
    };
  }
}

const geminiProvider = new GeminiProvider();
module.exports = geminiProvider;
