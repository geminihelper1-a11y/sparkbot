const { GoogleGenAI } = require('@google/genai');
const { NethrionError, CODES } = require('../../observability/errors');

class GeminiProvider {
  constructor({ apiKey, model, logger }) {
    this.configured = Boolean(apiKey);
    this.model = model || 'gemini-3.8-flash';
    this.logger = logger;
    this.client = apiKey ? new GoogleGenAI({ apiKey }) : null;
  }
  async generate({ input, system, tools = [] }) {
    if (!this.client) throw new NethrionError(CODES.PROVIDER_UNAVAILABLE, 'Gemini is not configured.');
    try {
      const interaction = await this.client.interactions.create({
        model: this.model,
        input: [{ type: 'user_input', content: input }],
        system_instruction: system || undefined,
        tools: tools.length ? tools.map(t => ({ type:'function', name:t.name, description:t.description, parameters:t.parameters })) : undefined
      });
      return { provider:'gemini', model:this.model, text:interaction.output_text || '', steps:interaction.steps || [], interactionId:interaction.id, usage:interaction.usage || null };
    } catch (e) {
      const m = String(e?.message || e);
      if (/429|quota|resource exhausted|rate limit/i.test(m)) throw new NethrionError(CODES.PROVIDER_QUOTA, m);
      throw new NethrionError(CODES.PROVIDER_UNAVAILABLE, m);
    }
  }
  async continueWithToolResult({ previousInteractionId, toolName, callId, result, tools = [] }) {
    if (!this.client) throw new NethrionError(CODES.PROVIDER_UNAVAILABLE, 'Gemini is not configured.');
    try {
      const interaction = await this.client.interactions.create({
        model:this.model,
        previous_interaction_id:previousInteractionId,
        tools:tools.length ? tools.map(t=>({type:'function',name:t.name,description:t.description,parameters:t.parameters})) : undefined,
        input:[{ type:'function_result', name:toolName, call_id:callId, result:[{type:'text', text:JSON.stringify(result)}] }]
      });
      return { provider:'gemini', model:this.model, text:interaction.output_text || '', steps:interaction.steps || [], interactionId:interaction.id, usage:interaction.usage || null };
    } catch (e) {
      const m = String(e?.message || e);
      if (/429|quota|resource exhausted|rate limit/i.test(m)) throw new NethrionError(CODES.PROVIDER_QUOTA, m);
      throw new NethrionError(CODES.PROVIDER_UNAVAILABLE, m);
    }
  }
}
module.exports = { GeminiProvider };
