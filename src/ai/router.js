const {NethrionError,CODES}=require('../observability/errors');
class AIRouter{
  constructor({gemini,groq,config,db,logger}){this.gemini=gemini;this.groq=groq;this.config=config;this.db=db;this.logger=logger;this.activeRequests=0;this.maxConcurrent=3;}
  get configured(){return this.gemini.configured;}
  get groqConfigured(){return this.groq.configured;}
  usageToday(guildId,userId){const day=new Date().toISOString().slice(0,10);const start=`${day}T00:00:00.000Z`;return {
    global:this.db.prepare(`SELECT COUNT(*) c FROM ai_usage WHERE created_at>=?`).get(start).c,
    guild:this.db.prepare(`SELECT COUNT(*) c FROM ai_usage WHERE guild_id=? AND created_at>=?`).get(guildId,start).c,
    user:this.db.prepare(`SELECT COUNT(*) c FROM ai_usage WHERE guild_id=? AND user_id=? AND created_at>=?`).get(guildId,userId,start).c
  };}
  enforceQuota(guildId,userId){const u=this.usageToday(guildId,userId);if(u.global>=this.config.aiGlobalDailyLimit||u.guild>=this.config.aiGuildDailyLimit||u.user>=this.config.aiUserDailyLimit)throw new NethrionError(CODES.PROVIDER_QUOTA,'NETHRION AI daily quota is exhausted for this scope.',{usage:u,limits:{global:this.config.aiGlobalDailyLimit,guild:this.config.aiGuildDailyLimit,user:this.config.aiUserDailyLimit}});}
  record(r,guildId,userId){const usage=r.usage||{};const tin=usage.input_tokens??usage.prompt_tokens??usage.promptTokenCount??0;const tout=usage.output_tokens??usage.completion_tokens??usage.candidatesTokenCount??0;this.db.prepare(`INSERT INTO ai_usage(guild_id,user_id,provider,model,tokens_in,tokens_out,created_at) VALUES(?,?,?,?,?,?,?)`).run(guildId,userId,r.provider,r.model,Number(tin)||0,Number(tout)||0,new Date().toISOString());this.logger.debug('AI response',r.provider,r.model,tin,tout);}
  markHealth(provider,status,errorCode=null){const now=new Date().toISOString();if(status==='healthy')this.db.prepare(`INSERT INTO provider_health(provider,status,last_error_code,consecutive_failures,last_ok_at,last_checked_at) VALUES(?,?,?,?,?,?) ON CONFLICT(provider) DO UPDATE SET status=excluded.status,last_error_code=NULL,consecutive_failures=0,last_ok_at=excluded.last_ok_at,last_checked_at=excluded.last_checked_at`).run(provider,status,null,0,now,now);else this.db.prepare(`INSERT INTO provider_health(provider,status,last_error_code,consecutive_failures,last_ok_at,last_checked_at) VALUES(?,?,?,?,?,?) ON CONFLICT(provider) DO UPDATE SET status=excluded.status,last_error_code=excluded.last_error_code,consecutive_failures=provider_health.consecutive_failures+1,last_checked_at=excluded.last_checked_at`).run(provider,status,errorCode,1,null,now);}
  async call({input,system,tools=[],complexity='normal',guildId,userId}){
    this.enforceQuota(guildId,userId);
    if(this.activeRequests>=this.maxConcurrent)throw new NethrionError(CODES.RATE_LIMIT,'NETHRION AI is busy. Please retry in a moment.');
    this.activeRequests++;
    const order=['gemini','groq'];let last=null;
    try{
    for(const p of order){const provider=p==='gemini'?this.gemini:this.groq;if(!provider.configured)continue;try{const r=await provider.generate({input,system,tools});this.record(r,guildId,userId);this.markHealth(p,'healthy');return r;}catch(e){last=e;this.markHealth(p,'degraded',e.code||'UNKNOWN');this.logger.warn(`AI provider ${p} failed`,e.code||e.message);}}
      throw last||new NethrionError(CODES.PROVIDER_UNAVAILABLE,'No configured AI provider is available.');
    } finally {this.activeRequests=Math.max(0,this.activeRequests-1);}
  }
}
module.exports={AIRouter};
