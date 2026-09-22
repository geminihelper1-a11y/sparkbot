const crypto=require('node:crypto');
function nextFrom(schedule,base=Date.now()){
  const s=String(schedule);const m=s.match(/^(?:in|every):(\d+)([smhd])$/i);
  if(m){const mult={s:1000,m:60000,h:3600000,d:86400000}[m[2].toLowerCase()];return base+Number(m[1])*mult;}
  const parsed=Date.parse(s);return Number.isFinite(parsed)?parsed:null;
}
class SchedulerService{
  constructor({db,logger}){this.db=db;this.logger=logger;this.timer=null;this.handlers=new Map();}
  register(type,fn){this.handlers.set(type,fn);}
  create({guildId,ownerId,type,payload,schedule,timezone='Asia/Karachi',idempotencyKey=crypto.randomUUID()}){const next=nextFrom(schedule);if(!next)throw new Error('Unsupported schedule. Use ISO timestamp, in:<n><s|m|h|d>, or every:<n><s|m|h|d>.');const now=new Date().toISOString();return this.db.prepare(`INSERT INTO scheduled_jobs(guild_id,owner_id,type,payload_json,schedule,timezone,status,next_run_at,idempotency_key,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)`).run(guildId,ownerId,type,JSON.stringify(payload||{}),schedule,timezone,'ACTIVE',new Date(next).toISOString(),idempotencyKey,now,now).lastInsertRowid;}
  list(guildId,limit=20){return this.db.prepare(`SELECT id,type,schedule,timezone,status,last_run_at,next_run_at,retries,created_at FROM scheduled_jobs WHERE guild_id=? ORDER BY id DESC LIMIT ?`).all(guildId,limit);}
  cancel(jobId){this.db.prepare(`UPDATE scheduled_jobs SET status='CANCELLED',updated_at=? WHERE id=?`).run(new Date().toISOString(),jobId);}
  start(){if(this.timer)return;this.timer=setInterval(()=>this.tick().catch(e=>this.logger.error('Scheduler tick failed',e)),5000);}
  stop(){if(this.timer){clearInterval(this.timer);this.timer=null;}}
  async tick(){const due=this.db.prepare(`SELECT * FROM scheduled_jobs WHERE status='ACTIVE' AND next_run_at IS NOT NULL AND next_run_at<=? ORDER BY id LIMIT 20`).all(new Date().toISOString());for(const job of due)await this.run(job);}
  async run(job){const runKey=`${job.id}:${job.next_run_at}`;const inserted=this.db.prepare(`INSERT OR IGNORE INTO job_runs(job_id,run_key,status,started_at) VALUES(?,?,?,?)`).run(job.id,runKey,'RUNNING',new Date().toISOString());if(!inserted.changes)return;const fn=this.handlers.get(job.type);if(!fn){this.finish(job,runKey,'FAILED','UNKNOWN');this.db.prepare(`UPDATE scheduled_jobs SET status='FAILED',next_run_at=NULL,updated_at=? WHERE id=?`).run(new Date().toISOString(),job.id);return;}try{await fn({...job,payload:JSON.parse(job.payload_json)});this.finish(job,runKey,'SUCCESS',null);}catch(e){this.finish(job,runKey,'FAILED',e.code||'UNKNOWN');const retry=Number(job.retries||0)+1;const retryAt=new Date(Date.now()+Math.min(15,2**Math.min(retry,4))*60000).toISOString();this.db.prepare(`UPDATE scheduled_jobs SET retries=?,status=?,last_run_at=?,next_run_at=?,updated_at=? WHERE id=?`).run(retry,retry>=3?'FAILED':'ACTIVE',new Date().toISOString(),retry>=3?null:retryAt,new Date().toISOString(),job.id);}}
  finish(job,runKey,status,errorCode){this.db.prepare(`UPDATE job_runs SET status=?,finished_at=?,error_code=? WHERE run_key=?`).run(status,new Date().toISOString(),errorCode,runKey);if(status!=='SUCCESS')return;const next=String(job.schedule).startsWith('every:')?nextFrom(job.schedule):null;this.db.prepare(`UPDATE scheduled_jobs SET last_run_at=?,next_run_at=?,status=?,updated_at=? WHERE id=?`).run(new Date().toISOString(),next?new Date(next).toISOString():null,next?'ACTIVE':'COMPLETED',new Date().toISOString(),job.id);}
}
module.exports={SchedulerService,nextFrom};
