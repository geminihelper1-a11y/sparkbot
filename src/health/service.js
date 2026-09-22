class HealthService{
  constructor({db,repos,config,ai,minecraft,scheduler}){this.db=db;this.repos=repos;this.config=config;this.ai=ai;this.minecraft=minecraft;this.scheduler=scheduler;}
  async snapshot(guild){
    const rows=[];
    rows.push({component:'discord',status:guild?.available?'healthy':'offline',details:{available:Boolean(guild?.available)}});
    try{this.db.prepare('SELECT 1').get();rows.push({component:'database',status:'healthy'});}catch(e){rows.push({component:'database',status:'offline',details:{message:e.message}});}
    rows.push({component:'gemini',status:this.ai?.configured?'configured':'not configured'});
    rows.push({component:'groq',status:this.ai?.groqConfigured?'configured':'not configured'});
    rows.push({component:'scheduler',status:this.scheduler?'healthy':'not configured'});
    if(guild){const smp=this.minecraft?.getConfig(guild.id);rows.push({component:'minecraft',status:smp?'configured':'not configured'});
      const pending=this.db.prepare(`SELECT COUNT(*) c FROM scheduled_jobs WHERE guild_id=? AND status='ACTIVE'`).get(guild.id)?.c||0;
      const errors=this.db.prepare(`SELECT COUNT(*) c FROM audit_events WHERE guild_id=? AND timestamp>=? AND result_state IN ('FAILED','UNKNOWN')`).get(guild.id,new Date(Date.now()-86400000).toISOString())?.c||0;
      rows.push({component:'queue',status:this.scheduler?'healthy':'unknown',details:{activeJobs:pending}});
      rows.push({component:'recent_errors',status:errors?'degraded':'healthy',details:{last24h:errors}});
    }
    const providerHealth=this.db.prepare(`SELECT provider,consecutive_failures,last_ok_at,last_checked_at FROM provider_health ORDER BY provider`).all();
    for(const p of providerHealth)rows.push({component:`provider:${p.provider}`,status:p.consecutive_failures>=3?'degraded':'healthy',details:p});
    const now=new Date().toISOString();for(const r of rows)this.db.prepare(`INSERT INTO health_snapshots(guild_id,component,status,details_json,checked_at) VALUES(?,?,?,?,?)`).run(guild?.id||null,r.component,r.status,JSON.stringify(r.details||{}),now);return rows;
  }
  explain(rows){const bad=rows.filter(r=>!['healthy','configured'].includes(r.status));return {status:bad.length?'degraded':'healthy',issues:bad,nextSteps:bad.map(x=>x.component==='recent_errors'?'Inspect recent audit error codes and provider failures.':`${x.component}: check configuration/connectivity`)};}
}
module.exports={HealthService};
