const { PermissionFlagsBits } = require('discord.js');
class MemoryService {
  constructor({repos}) { this.repos=repos; }
  get(guildId,userId,member){
    const staff=member?.permissions?.has?.(PermissionFlagsBits.ManageGuild)||member?.permissions?.has?.(PermissionFlagsBits.ViewAuditLog);
    if(userId!==member?.id && !staff) return {state:'BLOCKED',reason:'Memory for another member is restricted.'};
    return {state:'SUCCESS',source:'nethrion-db-memory',facts:this.repos.getMemory(guildId,userId)};
  }
  save(guildId,userId,type,content,source='explicit',quality=.6,expiresAt=null){this.repos.saveMemory(guildId,userId,type,content,source,quality,expiresAt);return {state:'SUCCESS'};}
}
module.exports={MemoryService};
