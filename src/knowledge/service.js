class KnowledgeService{
  constructor({repos}){this.repos=repos;}
  add(guildId,row){return this.repos.addKnowledge(guildId,row);}
  search(guildId,q,limit=8){return this.repos.searchKnowledge(guildId,q,limit).map(r=>({...r,evidence:{source:r.source,observedAt:r.updated_at,quality:1}}));}
  relate(guildId,fromType,fromId,relation,toType,toId,confidence=.7){this.repos.addRelation(guildId,fromType,fromId,relation,toType,toId,confidence);}
  relations(guildId,fromType,fromId,limit=20){return this.repos.relations(guildId,fromType,fromId,limit);}
  seedDefaults(guildId){
    const existing=this.search(guildId,'nethrion',1); if(existing.length)return;
    this.add(guildId,{category:'system',title:'NETHRION operating model',body:'NETHRION uses live Discord state for current Discord facts, Minecraft adapters for live SMP facts, and the NETHRION database for application-owned state. AI memory is not authority.',source:'system'});
    this.add(guildId,{category:'support',title:'How to get help',body:'Use the support area or ask NETHRION for the current support route. The bot must use the live server structure instead of inventing channel names.',source:'system'});
  }
}
module.exports={KnowledgeService};
