const { ChannelType,PermissionFlagsBits }=require('discord.js');
class TicketService{
  constructor({db,logger}){this.db=db;this.logger=logger;}
  async open(guild,member){
    const existing=this.db.prepare(`SELECT * FROM tickets WHERE guild_id=? AND creator_id=? AND status='OPEN'`).get(guild.id,member.id); if(existing?.channel_id) return guild.channels.cache.get(existing.channel_id)||existing;
    const categoryId=this.db.prepare(`SELECT json_extract(channels_json,'$.ticketCategoryId') v FROM guild_settings WHERE guild_id=?`).get(guild.id)?.v||null;
    const channel=await guild.channels.create({name:`ticket-${member.user.username.toLowerCase().replace(/[^a-z0-9]+/g,'-').slice(0,20)}-${String(member.id).slice(-4)}`,type:ChannelType.GuildText,parent:categoryId||undefined,permissionOverwrites:[{id:guild.roles.everyone.id,deny:[PermissionFlagsBits.ViewChannel]},{id:member.id,allow:[PermissionFlagsBits.ViewChannel,PermissionFlagsBits.SendMessages,PermissionFlagsBits.ReadMessageHistory]},{id:guild.members.me.id,allow:[PermissionFlagsBits.ViewChannel,PermissionFlagsBits.SendMessages,PermissionFlagsBits.ManageChannels,PermissionFlagsBits.ReadMessageHistory]}]});
    const now=new Date().toISOString();const result=this.db.prepare(`INSERT INTO tickets(guild_id,channel_id,creator_id,category,status,created_at) VALUES(?,?,?,?,?,?)`).run(guild.id,channel.id,member.id,'GENERAL','OPEN',now);this.db.prepare(`INSERT INTO ticket_events(ticket_id,event_type,actor_id,payload_json,created_at) VALUES(?,?,?,?,?)`).run(result.lastInsertRowid,'OPEN',member.id,'{}',now);await channel.send(`Support ticket opened for <@${member.id}>. Describe the issue here.`).catch(()=>{});return channel;
  }
  async close(guild,channelId,actorId){const t=this.db.prepare(`SELECT * FROM tickets WHERE guild_id=? AND channel_id=? AND status='OPEN'`).get(guild.id,channelId);if(!t)return {closed:false};this.db.prepare(`UPDATE tickets SET status='CLOSED',closed_at=? WHERE id=?`).run(new Date().toISOString(),t.id);this.db.prepare(`INSERT INTO ticket_events(ticket_id,event_type,actor_id,payload_json,created_at) VALUES(?,?,?,?,?)`).run(t.id,'CLOSE',actorId,'{}',new Date().toISOString());const c=guild.channels.cache.get(channelId);if(c)await c.delete(`Ticket closed by ${actorId}`).catch(()=>{});return {closed:true,ticketId:t.id};}
}
module.exports={TicketService};
