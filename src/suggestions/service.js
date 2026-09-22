class SuggestionService{
  constructor({db}){this.db=db;}
  add(guildId,authorId,content){
    const now=new Date().toISOString();const clean=String(content||'').trim();
    const groupKey=clean.toLowerCase().normalize('NFKC').replace(/[^\p{L}\p{N}\s]/gu,' ').replace(/\s+/g,' ').split(' ').filter(Boolean).slice(0,6).join(' ')||'uncategorized';
    const r=this.db.prepare(`INSERT INTO suggestions(guild_id,author_id,content,group_key,created_at,updated_at) VALUES(?,?,?,?,?,?)`).run(guildId,authorId,clean,groupKey,now,now);
    return r.lastInsertRowid;
  }
  recent(guildId,limit=20){return this.db.prepare(`SELECT * FROM suggestions WHERE guild_id=? ORDER BY id DESC LIMIT ?`).all(guildId,Math.min(50,Math.max(1,Number(limit)||20)));}
  groups(guildId){return this.db.prepare(`SELECT group_key,COUNT(*) count,GROUP_CONCAT(content,' | ') examples FROM suggestions WHERE guild_id=? AND group_key IS NOT NULL GROUP BY group_key ORDER BY count DESC`).all(guildId);}
}
module.exports={SuggestionService};
