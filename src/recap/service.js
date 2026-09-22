class RecapService {
  constructor({db}){this.db=db;}
  collect(guildId,hours=24){
    const since=new Date(Date.now()-hours*3600000).toISOString();const rows=[];
    for(const r of this.db.prepare(`SELECT created_at AS time,event_type||COALESCE(' — '||subject_id,'') AS summary,* FROM analytics_events WHERE guild_id=? AND created_at>=? ORDER BY created_at DESC LIMIT 200`).all(guildId,since))rows.push({type:'analytics',time:r.time,summary:r.summary,raw:r});
    for(const r of this.db.prepare(`SELECT created_at AS time,event_type||': '||COALESCE(from_status,'?')||' -> '||COALESCE(to_status,'?') AS summary,* FROM smp_events WHERE guild_id=? AND created_at>=? ORDER BY created_at DESC LIMIT 100`).all(guildId,since))rows.push({type:'minecraft',time:r.time,summary:r.summary,raw:r});
    for(const r of this.db.prepare(`SELECT last_seen_at AS time,incident_key||' ('||severity||')' AS summary,* FROM security_incidents WHERE guild_id=? AND last_seen_at>=? ORDER BY last_seen_at DESC LIMIT 100`).all(guildId,since))rows.push({type:'security',time:r.time,summary:r.summary,raw:r});
    for(const r of this.db.prepare(`SELECT COALESCE(closed_at,created_at) AS time,'ticket '||status||' #'||id AS summary,* FROM tickets WHERE guild_id=? AND (created_at>=? OR closed_at>=?) ORDER BY time DESC LIMIT 100`).all(guildId,since,since))rows.push({type:'tickets',time:r.time,summary:r.summary,raw:r});
    for(const r of this.db.prepare(`SELECT created_at AS time,'report #'||id||' '||status AS summary,* FROM reports WHERE guild_id=? AND created_at>=? ORDER BY created_at DESC LIMIT 100`).all(guildId,since))rows.push({type:'reports',time:r.time,summary:r.summary,raw:r});
    return rows.sort((a,b)=>Date.parse(b.time)-Date.parse(a.time)).slice(0,300);
  }
  compact(guildId,hours=24){const items=this.collect(guildId,hours);const counts={};for(const x of items)counts[x.type]=(counts[x.type]||0)+1;return {state:'SUCCESS',hours,items,counts};}
}
module.exports={RecapService};
