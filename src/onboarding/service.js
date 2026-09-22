const { PermissionFlagsBits } = require('discord.js');
class OnboardingService {
  constructor({repos,logger}){this.repos=repos;this.logger=logger;}
  async handle(member){
    const settings=this.repos.getGuildSettings(member.guild.id);if(!settings)return;
    const welcomeId=settings.channels?.welcomeChannelId;
    if(welcomeId){const ch=member.guild.channels.cache.get(welcomeId);if(ch?.isTextBased?.())await ch.send({content:`Welcome <@${member.id}>. Check the server rules and support area. Ask NETHRION when you need help.`,allowedMentions:{users:[member.id]}}).catch(e=>this.logger.warn('Onboarding welcome failed',e.message));}
    const roleId=settings.roles?.memberRoleId;
    if(roleId){const role=member.guild.roles.cache.get(roleId);const me=member.guild.members.me;if(role&&me?.permissions.has(PermissionFlagsBits.ManageRoles)&&me.roles.highest.position>role.position)await member.roles.add(role,'NETHRION onboarding').catch(e=>this.logger.warn('Onboarding role failed',e.message));}
  }
}
module.exports={OnboardingService};
