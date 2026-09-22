// NETHRION BOT 2.0 - Groq Fallback AI Provider
const config = require('../core/config');
const logger = require('../core/logger');
const ToolRegistry = require('./toolRegistry');
const PromptBuilder = require('./promptBuilder');
const actionEngine = require('../discord/actionEngine');

class GroqProvider {
  constructor() {
    this.groq = null;
    if (config.ai.groqKey) {
      try {
        const Groq = require('groq-sdk');
        this.groq = new Groq({ apiKey: config.ai.groqKey });
      } catch (err) {
        logger.error('GROQ', 'Failed to load Groq SDK', { error: err.message });
      }
    }
  }

  isAvailable() {
    return !!this.groq;
  }

  async processInteraction({ message, guild, callerMember, channel }) {
    if (!this.isAvailable()) {
      throw new Error('Groq fallback provider is not available');
    }

    const systemPrompt = PromptBuilder.buildSystemPrompt(guild, callerMember.user);
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: message.content }
    ];

    const response = await this.groq.chat.completions.create({
      model: config.ai.groqModel,
      messages,
      tools: ToolRegistry.toGroqTools(),
      tool_choice: 'auto',
      max_tokens: config.ai.maxTokens
    });

    const choice = response.choices[0];
    const messageResponse = choice.message;

    if (!messageResponse.tool_calls || messageResponse.tool_calls.length === 0) {
      return {
        reply: messageResponse.content || 'Action acknowledged.',
        toolUsed: null
      };
    }

    const toolCall = messageResponse.tool_calls[0];
    const toolDef = ToolRegistry.getTool(toolCall.function.name);

    if (!toolDef) {
      return {
        reply: `Selected tool "${toolCall.function.name}" is not registered.`,
        toolUsed: toolCall.function.name
      };
    }

    let parsedArgs = {};
    try {
      parsedArgs = JSON.parse(toolCall.function.arguments);
    } catch (e) {}

    const actionResult = await actionEngine.execute({
      guild,
      callerMember,
      toolDefinition: toolDef,
      args: parsedArgs,
      channel
    });

    // Follow-up with synthesized result
    messages.push(messageResponse);
    messages.push({
      role: 'tool',
      tool_call_id: toolCall.id,
      content: JSON.stringify(actionResult)
    });

    const secondResponse = await this.groq.chat.completions.create({
      model: config.ai.groqModel,
      messages,
      max_tokens: config.ai.maxTokens
    });

    return {
      reply: secondResponse.choices[0].message.content,
      toolUsed: toolDef.name,
      actionResult
    };
  }
}

const groqProvider = new GroqProvider();
module.exports = groqProvider;
