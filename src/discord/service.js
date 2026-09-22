const {PermissionFlagsBits}=require('discord.js');
const {resolveChannel,resolveMember,resolveRole}=require('../resolvers/entities');
const {explainEffectiveChannelAccess}=require('../permissions/engine');

class DiscordService{
  constructor({repos,logger,config}){this.repos=repos;this.logger=logger;this.config=config;}
  syncGuild(guild){
    this.repos.ensureGuild(guild.id,this.config.timezone);
    for(const r of guild.roles.cache.values())this.repos.upsertRole(guild.id,{id:r.id,name:r.name,position:r.position,managed:r.managed,permissions:r.permissions.toArray()});
    for(const c of guild.channels.cache.values())this.repos.upsertChannel(guild.id,{id:c.id,name:c.name,type:c.type,parentId:c.parentId,position:c.position});
    const rel=this.repos.db;
    for(const c of guild.channels.cache.values())if(c.parentId)rel.prepare(`INSERT INTO knowledge_relations(guild_id,from_type,from_id,relation,to_type,to_id,confidence,created_at) SELECT ?,?,?,?,?,?,?,? WHERE NOT EXISTS (SELECT 1 FROM knowledge_relations WHERE guild_id=? AND from_type='channel' AND from_id=? AND relation='parent' AND to_type='channel' AND to_id=?)`).run(guild.id,'channel',c.id,'parent','channel',c.parentId,1,new Date().toISOString(),guild.id,c.id,c.parentId);
    for(const m of guild.members.cache.values())for(const role of m.roles.cache.values()){if(role.id===guild.id)continue;rel.prepare(`INSERT INTO knowledge_relations(guild_id,from_type,from_id,relation,to_type,to_id,confidence,created_at) SELECT ?,?,?,?,?,?,?,? WHERE NOT EXISTS (SELECT 1 FROM knowledge_relations WHERE guild_id=? AND from_type='member' AND from_id=? AND relation='has_role' AND to_type='role' AND to_id=?)`).run(guild.id,'member',m.id,'has_role','role',role.id,1,new Date().toISOString(),guild.id,m.id,role.id);}
    for(const role of guild.roles.cache.values())for(const permission of role.permissions.toArray())rel.prepare(`INSERT INTO knowledge_relations(guild_id,from_type,from_id,relation,to_type,to_id,confidence,created_at) SELECT ?,?,?,?,?,?,?,? WHERE NOT EXISTS (SELECT 1 FROM knowledge_relations WHERE guild_id=? AND from_type='role' AND from_id=? AND relation='grants' AND to_type='permission' AND to_id=?)`).run(guild.id,'role',role.id,'grants','permission',permission,1,new Date().toISOString(),guild.id,role.id,permission);
    for(const m of guild.members.cache.values())this.repos.upsertMember(guild.id,{id:m.id,username:m.user.username,displayName:m.displayName,roleIds:[...m.roles.cache.keys()],joinedAt:m.joinedAt?.toISOString(),lastSeenAt:null});
  }
  overview(guild){return {guildId:guild.id,name:guild.name,ownerId:guild.ownerId,members:guild.memberCount,roles:guild.roles.cache.size,channels:guild.channels.cache.size,textChannels:guild.channels.cache.filter(c=>c.isTextBased?.()).size,available:guild.available};}
  resolveMember(guild,q){return resolveMember(guild,q);}
  resolveRole(guild,q){return resolveRole(guild,q);}
  resolveChannel(guild,q){return resolveChannel(guild,q);}
  effectiveAccess(guild,userId,channelId,permission){const m=guild.members.cache.get(userId);const c=guild.channels.cache.get(channelId);if(!m||!c)return {state:'UNKNOWN',reason:'Member or channel not found.'};return explainEffectiveChannelAccess(m,c,permission);}
  async searchHistory(guild,query,channelQuery,limit,member){
    const max=Math.min(Number(limit)||50,this.config.historySearchMaxMessages);let channels=[];
    if(channelQuery){const r=resolveChannel(guild,channelQuery);if(r.value)channels=[r.value];else return {state:'UNKNOWN',results:[],reason:'Channel not found.'};}
    else channels=[...guild.channels.cache.values()].filter(c=>c.isTextBased?.()&&!c.isThread?.()).slice(0,20);
    const q=String(query||'').toLowerCase();const results=[];let inspected=0;
    for(const ch of channels){if(inspected>=max)break;const view=member?ch.permissionsFor(member)?.has(PermissionFlagsBits.ViewChannel):true;if(!view)continue;let before;while(inspected<max){const remaining=Math.min(100,max-inspected);const batch=await ch.messages.fetch({limit:remaining,before}).catch(()=>null);if(!batch?.size)break;for(const m of batch.values()){inspected++;if((m.content||'').toLowerCase().includes(q))results.push({messageId:m.id,channelId:ch.id,channelName:ch.name,authorId:m.author.id,author:m.author.username,content:m.content,createdAt:m.createdAt.toISOString()});if(inspected>=max)break;}before=batch.last()?.id||undefined;if(batch.size<remaining)break;}}
    return {state:inspected>=max?'PARTIAL':'SUCCESS',inspected,results:results.slice(0,100)};
  }
  async refreshMember(guild,id){const m=await guild.members.fetch(id).catch(()=>null);if(m)this.repos.upsertMember(guild.id,{id:m.id,username:m.user.username,displayName:m.displayName,roleIds:[...m.roles.cache.keys()],joinedAt:m.joinedAt?.toISOString(),lastSeenAt:new Date().toISOString()});return m;}
  async reconcileGuild(guild){this.syncGuild(guild);return this.overview(guild);}
  async audit(guild,limit=20){const logs=await guild.fetchAuditLogs({limit});if(!logs)return {state:'UNKNOWN',entries:[]};return {state:'SUCCESS',entries:[...logs.entries.values()].map(e=>({id:e.id,action:String(e.action),actorId:e.executor?.id||null,targetId:e.target?.id||null,targetName:e.target?.name||e.target?.username||null,createdAt:e.createdAt?.toISOString(),reason:e.reason||null}))};}
  async botPermissions(guild){const me=guild.members.me||await guild.members.fetchMe().catch(()=>null);return me?{id:me.id,highestRole:me.roles.highest?.name,highestPosition:me.roles.highest?.position,permissions:me.permissions.toArray()}:null;}
}
module.exports={DiscordService};
