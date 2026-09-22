class AnalyticsService{
  constructor({db}){this.db=db;}
  event(guildId,type,subjectId,payload={}){this.db.prepare(`INSERT INTO analytics_events(guild_id,event_type,subject_id,payload_json,created_at) VALUES(?,?,?,?,?)`).run(guildId,type,subjectId||null,JSON.stringify(payload),new Date().toISOString());}
  rollup(guildId,day=new Date().toISOString().slice(0,10)){
    const rows=this.db.prepare(`SELECT event_type,COUNT(*) c FROM analytics_events WHERE guild_id=? AND created_at>=? AND created_at<? GROUP BY event_type`).all(guildId,`${day}T00:00:00.000Z`,new Date(Date.parse(`${day}T00:00:00.000Z`)+86400000).toISOString());
    const up=this.db.prepare(`INSERT INTO analytics_daily(guild_id,day,metric,value,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(guild_id,day,metric) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at`);const now=new Date().toISOString();
    for(const r of rows)up.run(guildId,day,r.event_type,r.c,now); return rows;
  }
  summary(guildId,days=7){const since=new Date(Date.now()-days*86400000).toISOString();return this.db.prepare(`SELECT event_type,COUNT(*) c FROM analytics_events WHERE guild_id=? AND created_at>=? GROUP BY event_type ORDER BY c DESC`).all(guildId,since);}
  actionableSummary(guildId,days=7){
    const safe=Math.min(30,Math.max(1,Number(days)||7));const since=new Date(Date.now()-safe*86400000).toISOString();
    const count=(sql,params=[guildId,since])=>this.db.prepare(sql).get(...params)?.c||0;
    const top=this.summary(guildId,safe).slice(0,10);
    const members=count(`SELECT COUNT(DISTINCT subject_id) c FROM analytics_events WHERE guild_id=? AND created_at>=? AND event_type='message' AND subject_id IS NOT NULL`);
    const messages=count(`SELECT COUNT(*) c FROM analytics_events WHERE guild_id=? AND created_at>=? AND event_type='message'`);
    const joins=count(`SELECT COUNT(*) c FROM analytics_events WHERE guild_id=? AND created_at>=? AND event_type='member_joined'`);
    const leaves=count(`SELECT COUNT(*) c FROM analytics_events WHERE guild_id=? AND created_at>=? AND event_type='member_left'`);
    const tickets=count(`SELECT COUNT(*) c FROM tickets WHERE guild_id=? AND created_at>=?`);
    const reports=count(`SELECT COUNT(*) c FROM reports WHERE guild_id=? AND created_at>=?`);
    const incidents=count(`SELECT COUNT(*) c FROM security_incidents WHERE guild_id=? AND created_at>=?`);
    const outages=count(`SELECT COUNT(*) c FROM smp_events WHERE guild_id=? AND created_at>=? AND event_type='OUTAGE'`);
    return {days:safe,since,activeMembers:members,messages,joins,leaves,tickets,reports,securityIncidents:incidents,smpOutages:outages,topEvents:top};
  }
}
module.exports={AnalyticsService};
