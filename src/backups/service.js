const fs=require('node:fs');const path=require('node:path');const crypto=require('node:crypto');
class BackupService{
  constructor({db,config,logger}){this.db=db;this.config=config;this.logger=logger;fs.mkdirSync(config.backupDir,{recursive:true});}
  async create(guild,actorId){
    const stamp=new Date().toISOString().replace(/[:.]/g,'-');const dir=path.join(this.config.backupDir,guild.id);fs.mkdirSync(dir,{recursive:true});
    const manifest={schemaVersion:2,scope:'NETHRION-owned state + Discord-exposed metadata',guild:{id:guild.id,name:guild.name,ownerId:guild.ownerId},createdAt:new Date().toISOString(),actorId,roles:[...guild.roles.cache.values()].map(r=>({id:r.id,name:r.name,position:r.position,managed:r.managed,permissions:r.permissions.toArray()})),channels:[...guild.channels.cache.values()].map(c=>({id:c.id,name:c.name,type:c.type,parentId:c.parentId,position:c.position})),warning:'No claim is made for DMs, unavailable attachment binaries, or data Discord did not expose.'};
    const file=path.join(dir,`backup-${stamp}.json`);fs.writeFileSync(file,JSON.stringify(manifest,null,2));
    const dbCopy=path.join(dir,`backup-${stamp}.sqlite`);await this.db.db.backup(dbCopy).catch(e=>{try{fs.unlinkSync(dbCopy)}catch{};throw e;});manifest.databaseSnapshot=path.basename(dbCopy);fs.writeFileSync(file,JSON.stringify(manifest,null,2));
    const checksum=crypto.createHash('sha256').update(fs.readFileSync(file)).update(fs.readFileSync(dbCopy)).digest('hex');const row=this.db.prepare(`INSERT INTO backups(guild_id,path,manifest_json,created_at,checksum) VALUES(?,?,?,?,?)`).run(guild.id,file,JSON.stringify(manifest),manifest.createdAt,checksum);
    this.prune(guild.id);return {ok:true,id:row.lastInsertRowid,path:file,databaseSnapshot:dbCopy,checksum,scope:manifest.scope};
  }
  list(guildId,limit=10){return this.db.prepare(`SELECT id,path,checksum,created_at FROM backups WHERE guild_id=? ORDER BY id DESC LIMIT ?`).all(guildId,limit);}
  prune(guildId){const rows=this.db.prepare(`SELECT id,path,manifest_json FROM backups WHERE guild_id=? ORDER BY id DESC`).all(guildId);for(const r of rows.slice(this.config.backupRetention)){try{fs.unlinkSync(r.path)}catch{};try{const m=JSON.parse(r.manifest_json);if(m.databaseSnapshot)fs.unlinkSync(path.join(path.dirname(r.path),m.databaseSnapshot))}catch{};this.db.prepare(`DELETE FROM backups WHERE id=?`).run(r.id);}}
}
module.exports={BackupService};
