function json(v) { return JSON.stringify(v ?? {}); }
function parse(v, fallback={}) { try { return v ? JSON.parse(v) : fallback; } catch { return fallback; } }

class Repositories {
  constructor(db) { this.db = db; }
  ensureGuild(guildId, timezone='Asia/Karachi') {
    this.db.prepare(`INSERT INTO guild_settings(guild_id,timezone,updated_at) VALUES(?,?,?) ON CONFLICT(guild_id) DO NOTHING`).run(guildId, timezone, new Date().toISOString());
  }
  getGuildSettings(guildId) {
    const r=this.db.prepare(`SELECT * FROM guild_settings WHERE guild_id=?`).get(guildId); if (!r) return null;
    return {...r, featureFlags:parse(r.feature_flags_json,{}), providerOrder:parse(r.provider_order_json,[]), aiLimits:parse(r.ai_limits_json,{}), channels:parse(r.channels_json,{}), roles:parse(r.roles_json,{}), privacy:parse(r.privacy_json,{})};
  }
  updateGuildSettings(guildId, patch={}) {
    this.ensureGuild(guildId);
    const cur=this.getGuildSettings(guildId);
    const next={...cur,...patch};
    this.db.prepare(`UPDATE guild_settings SET mode=?,timezone=?,feature_flags_json=?,provider_order_json=?,ai_limits_json=?,channels_json=?,roles_json=?,privacy_json=?,updated_at=? WHERE guild_id=?`).run(next.mode,next.timezone,json(next.featureFlags),json(next.providerOrder),json(next.aiLimits),json(next.channels),json(next.roles),json(next.privacy),new Date().toISOString(),guildId);
  }
  upsertMember(guildId,m) { this.db.prepare(`INSERT INTO members_index(guild_id,member_id,username,display_name,roles_json,joined_at,last_seen_at,refreshed_at) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(guild_id,member_id) DO UPDATE SET username=excluded.username,display_name=excluded.display_name,roles_json=excluded.roles_json,joined_at=excluded.joined_at,last_seen_at=excluded.last_seen_at,refreshed_at=excluded.refreshed_at`).run(guildId,m.id,m.username,m.displayName,json(m.roleIds||[]),m.joinedAt||null,m.lastSeenAt||null,new Date().toISOString()); }
  upsertRole(guildId,r) { this.db.prepare(`INSERT INTO roles_index(guild_id,role_id,name,position,managed,permissions_json,refreshed_at) VALUES(?,?,?,?,?,?,?) ON CONFLICT(guild_id,role_id) DO UPDATE SET name=excluded.name,position=excluded.position,managed=excluded.managed,permissions_json=excluded.permissions_json,refreshed_at=excluded.refreshed_at`).run(guildId,r.id,r.name,r.position,r.managed?1:0,json(r.permissions||[]),new Date().toISOString()); }
  upsertChannel(guildId,c) { this.db.prepare(`INSERT INTO channels_index(guild_id,channel_id,name,type,parent_id,position,refreshed_at) VALUES(?,?,?,?,?,?,?) ON CONFLICT(guild_id,channel_id) DO UPDATE SET name=excluded.name,type=excluded.type,parent_id=excluded.parent_id,position=excluded.position,refreshed_at=excluded.refreshed_at`).run(guildId,c.id,c.name,c.type,c.parentId||null,c.position??null,new Date().toISOString()); }
  deleteIndex(kind,guildId,id) { this.db.prepare(`DELETE FROM ${kind}_index WHERE guild_id=? AND ${kind.slice(0,-1)}_id=?`).run(guildId,id); }
  addAudit(e) { this.db.prepare(`INSERT INTO audit_events(guild_id,action_id,actor_id,request,resolved_intent,tool_name,target_json,permission_json,result_state,error_code,timestamp) VALUES(?,?,?,?,?,?,?,?,?,?,?)`).run(e.guildId,e.actionId,e.actorId,e.request||'',e.resolvedIntent||'',e.toolName||'',json(e.target||{}),json(e.permission||{}),e.resultState,e.errorCode||null,new Date().toISOString()); }
  recordAnalytics(guildId,eventType,subjectId,payload={}) { this.db.prepare(`INSERT INTO analytics_events(guild_id,event_type,subject_id,payload_json,created_at) VALUES(?,?,?,?,?)`).run(guildId,eventType,subjectId||null,json(payload),new Date().toISOString()); }
  saveMemory(guildId,subjectId,type,content,source='conversation',quality=.5,expiresAt=null) { const now=new Date().toISOString(); this.db.prepare(`INSERT INTO memory_facts(guild_id,subject_id,type,content,source,quality,created_at,updated_at,expires_at) VALUES(?,?,?,?,?,?,?,?,?)`).run(guildId,subjectId,type,content,source,quality,now,now,expiresAt); }
  getMemory(guildId,subjectId,{limit=20}={}) { return this.db.prepare(`SELECT * FROM memory_facts WHERE guild_id=? AND subject_id=? AND (expires_at IS NULL OR expires_at>?) ORDER BY quality DESC, updated_at DESC LIMIT ?`).all(guildId,subjectId,new Date().toISOString(),limit); }
  addTurn(guildId,userId,channelId,role,content) { this.db.prepare(`INSERT INTO conversation_turns(guild_id,user_id,channel_id,role,content,created_at) VALUES(?,?,?,?,?,?)`).run(guildId,userId,channelId,role,content,new Date().toISOString()); }
  recentTurns(guildId,userId,limit=8) { return this.db.prepare(`SELECT * FROM conversation_turns WHERE guild_id=? AND user_id=? ORDER BY id DESC LIMIT ?`).all(guildId,userId,limit).reverse(); }
  addKnowledge(guildId,row) { const now=new Date().toISOString(); return this.db.prepare(`INSERT INTO knowledge_documents(guild_id,category,title,body,source,version,editor_id,created_at,updated_at,review_at,expires_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)`).run(guildId,row.category,row.title,row.body,row.source||'owner',row.version||1,row.editorId||null,now,now,row.reviewAt||null,row.expiresAt||null).lastInsertRowid; }
  searchKnowledge(guildId,q,limit=8) { const needle=`%${q.replace(/[%_]/g,'')}%`; return this.db.prepare(`SELECT * FROM knowledge_documents WHERE guild_id=? AND active=1 AND (title LIKE ? OR body LIKE ? OR category LIKE ?) ORDER BY updated_at DESC LIMIT ?`).all(guildId,needle,needle,needle,limit); }
  setPanel(guildId,key,channelId,messageId) { this.db.prepare(`INSERT INTO panels(guild_id,panel_key,channel_id,message_id,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(guild_id,panel_key) DO UPDATE SET channel_id=excluded.channel_id,message_id=excluded.message_id,updated_at=excluded.updated_at`).run(guildId,key,channelId,messageId,new Date().toISOString()); }
  getPanel(guildId,key) { return this.db.prepare(`SELECT * FROM panels WHERE guild_id=? AND panel_key=?`).get(guildId,key); }
  addRelation(guildId,fromType,fromId,relation,toType,toId,confidence=.5) { this.db.prepare(`INSERT INTO knowledge_relations(guild_id,from_type,from_id,relation,to_type,to_id,confidence,created_at) VALUES(?,?,?,?,?,?,?,?)`).run(guildId,fromType,fromId,relation,toType,toId,confidence,new Date().toISOString()); }
  relations(guildId,fromType,fromId,limit=20) { return this.db.prepare(`SELECT * FROM knowledge_relations WHERE guild_id=? AND from_type=? AND from_id=? ORDER BY confidence DESC,id DESC LIMIT ?`).all(guildId,fromType,fromId,limit); }
}
module.exports = { Repositories };
