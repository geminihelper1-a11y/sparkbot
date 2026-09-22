const { NethrionError, CODES } = require('../../observability/errors');
class GroqProvider {
  constructor({ apiKey, model, logger }) { this.configured=Boolean(apiKey); this.model=model || 'openai/gpt-oss-20b'; this.logger=logger; this.apiKey=apiKey; }
  async generate({input,system,tools=[]}) {
    if(!this.configured) throw new NethrionError(CODES.PROVIDER_UNAVAILABLE,'Groq is not configured.');
    const body={model:this.model,messages:[...(system?[{role:'system',content:system}]:[]),{role:'user',content:input}],temperature:0.2,max_tokens:900};
    if(tools.length) body.tools=tools.map(t=>({type:'function',function:{name:t.name,description:t.description,parameters:t.parameters}}));
    const res=await fetch('https://api.groq.com/openai/v1/chat/completions',{method:'POST',headers:{'content-type':'application/json','authorization':`Bearer ${this.apiKey}`},body:JSON.stringify(body)}).catch(e=>{throw new NethrionError(CODES.PROVIDER_UNAVAILABLE,e.message)});
    const raw=await res.text();let data;try{data=JSON.parse(raw)}catch{data={error:{message:raw}}}
    if(!res.ok){const m=String(data?.error?.message||raw);if(res.status===429||/quota|rate limit/i.test(m))throw new NethrionError(CODES.PROVIDER_QUOTA,m);throw new NethrionError(CODES.PROVIDER_UNAVAILABLE,m)}
    const msg=data.choices?.[0]?.message||{};const steps=(msg.tool_calls||[]).map(c=>({type:'function_call',name:c.function?.name,arguments:JSON.parse(c.function?.arguments||'{}'),id:c.id}));return {provider:'groq',model:this.model,text:msg.content||'',steps,usage:data.usage||null};
  }
}
module.exports={GroqProvider};
