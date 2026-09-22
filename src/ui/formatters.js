const {EmbedBuilder,ActionRowBuilder,ButtonBuilder,ButtonStyle}=require('discord.js');

function actionPreview(result){
  const p=result.plan||{};
  const expires=Date.parse(result.expiresAt||'');
  const lines=[`Action: **${p.toolName||'unknown'}**`,`Risk: **${p.risk||'unknown'}**`,`Target: ${JSON.stringify(p.target||{})}`,'Changes:',...((p.changes||[]).map(x=>`• ${x}`))];
  if(p.sideEffects?.length)lines.push('Side effects:',...p.sideEffects.map(x=>`• ${x}`));
  if(Number.isFinite(expires))lines.push('',`Expires <t:${Math.floor(expires/1000)}:R>`);
  return new EmbedBuilder().setTitle('Action preview').setDescription(lines.join('\n'));
}

function actionButtons(actionId){
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`nethrion_confirm:${actionId}`).setLabel('Confirm').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`nethrion_cancel:${actionId}`).setLabel('Cancel').setStyle(ButtonStyle.Secondary)
  );
}

function safeText(value,max=1900){const text=String(value||'').replace(/@everyone|@here/g,'');return text.length>max?text.slice(0,max-3)+'...':text;}
module.exports={actionPreview,actionButtons,safeText};
