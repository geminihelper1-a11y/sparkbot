const {EmbedBuilder,ActionRowBuilder,ButtonBuilder,ButtonStyle}=require('discord.js');

const STATUS_LABELS={ONLINE:'Online',OFFLINE:'Offline',UNKNOWN:'Unknown',NOT_CONFIGURED:'Not configured',healthy:'Healthy',configured:'Configured',degraded:'Degraded',offline:'Offline',unknown:'Unknown','not configured':'Not configured'};
const INTERNAL_KEYS=new Set(['guildId','ownerId','channelId','messageId','authorId','targetId','roleId','discordId','actionId','callId','source','checkedAt','createdAt','updatedAt','raw','raw_json','evidence','permission','meta','precondition','args']);

function humanStatus(value){const key=String(value??'UNKNOWN');return STATUS_LABELS[key]||STATUS_LABELS[key.toUpperCase()]||key.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase());}
function safeText(value,max=1900){
  const text=String(value??'').replace(/@everyone|@here/g,'').trim();
  return text.length>max?text.slice(0,max-3)+'...':text;
}
function cleanValue(value){return String(value??'').replace(/`/g,'').trim();}
function maskInternal(value){return INTERNAL_KEYS.has(value)?null:value;}
function formatCount(value,label){const n=Number(value)||0;return `${n} ${label}${n===1?'':'s'}`;}
function formatOverview(data){
  const name=cleanValue(data?.name||'NETHRION')||'NETHRION';
  const members=Number(data?.members);
  const roles=Number(data?.roles);
  const channels=Number(data?.channels);
  if([members,roles,channels].some(Number.isNaN)) return 'I could not read the current server overview.';
  const parts=[formatCount(members,'member'),formatCount(roles,'role'),formatCount(channels,'channel')];
  return `**${name}** has ${parts[0]}, ${parts[1]} and ${parts[2]}.`;
}
function formatSmpEdition(item){
  if(!item)return 'Unknown';
  const status=humanStatus(item.status);
  const players=Number.isFinite(Number(item.playersOnline))?` · ${Number(item.playersOnline)}/${item.playersMax==null?'?':Number(item.playersMax)} players`:'';
  return `${status}${players}`;
}
function formatSmp(data){
  const java=data?.java||{}; const bedrock=data?.bedrock||{};
  return `**Java** — ${formatSmpEdition(java)}\n**Bedrock** — ${formatSmpEdition(bedrock)}`;
}
function formatHealth(rows=[]){
  const list=rows.map(r=>`**${cleanValue(String(r.component||'System').replace(/^provider:/,''))}** — ${humanStatus(r.status)}`);
  return list.length?list.join('\n'):'No health data available.';
}
function formatAnalytics(data,days){
  if(!data)return 'No analytics data available.';
  if(Object.prototype.hasOwnProperty.call(data,'activeMembers')){
    return `Last ${Number(data.days)||Number(days)||7} days\nActive members: **${Number(data.activeMembers)||0}**\nMessages: **${Number(data.messages)||0}**\nJoins: **${Number(data.joins)||0}**\nLeaves: **${Number(data.leaves)||0}**\nTickets: **${Number(data.tickets)||0}**\nReports: **${Number(data.reports)||0}**\nSecurity incidents: **${Number(data.securityIncidents)||0}**\nSMP outages: **${Number(data.smpOutages)||0}**`;
  }
  if(Array.isArray(data))return data.slice(0,12).map(r=>`**${cleanValue(r.event_type||r.type||'Event')}** — ${Number(r.c)||Number(r.count)||0}`).join('\n')||'No analytics data yet.';
  return 'No analytics data available.';
}
function formatRecap(data){
  const items=Array.isArray(data?.items)?data.items:Array.isArray(data)?data:[];
  if(!items.length)return `No meaningful events recorded in the last ${Number(data?.hours)||24} hours.`;
  return `Last ${Number(data?.hours)||24} hours\n${items.slice(0,12).map(x=>`• ${safeText(x.summary||'Activity recorded.',300)}`).join('\n')}`;
}
function formatSearchResults(data){
  const results=Array.isArray(data?.results)?data.results:[];
  if(!results.length)return 'I could not find a matching message.';
  const lines=results.slice(0,8).map(r=>`• **#${cleanValue(r.channelName||'unknown')}** · ${cleanValue(r.author||'unknown')} — ${safeText(r.content||'',220)}`);
  const suffix=data?.state==='PARTIAL'?'\nSearch was limited by the configured history limit.':'';
  return `I found ${results.length} matching message${results.length===1?'':'s'}.\n${lines.join('\n')}${suffix}`;
}
function formatKnowledge(data){
  const results=Array.isArray(data?.results)?data.results:[];
  if(!results.length)return 'I could not find that in NETHRION knowledge.';
  return results.slice(0,6).map(r=>`**${safeText(r.title||'Knowledge',120)}**\n${safeText(r.body||'',420)}`).join('\n\n');
}
function formatMemory(data){
  const rows=Array.isArray(data)?data:Array.isArray(data?.rows)?data.rows:[];
  if(!rows.length)return 'No stored memory is available.';
  return `Stored memory\n${rows.slice(0,8).map(r=>`• ${safeText(r.content||'',260)}`).join('\n')}`;
}
function formatAccess(data){
  if(!data)return 'I could not determine channel access.';
  if(data.state==='UNKNOWN')return safeText(data.reason||'I could not determine channel access.');
  const allowed=data.allowed??data.hasAccess??data.result;
  if(typeof allowed==='boolean')return allowed?'Access is allowed.':'Access is denied.';
  return safeText(data.reason||'Access could not be determined.');
}
function formatReports(rows=[]){
  if(!rows.length)return 'No open reports were found.';
  return rows.slice(0,12).map(r=>`• Report #${r.id} · ${humanStatus(r.status)} · <@${r.target_id}> · ${safeText(r.reason||'',220)}`).join('\n');
}
function formatIncidents(rows=[]){
  if(!rows.length)return 'No security incidents were found.';
  return rows.slice(0,12).map(r=>`• ${safeText(r.incident_key||'Incident',80)} · ${humanStatus(r.severity||'unknown')} · ${safeText(r.status||'OPEN',40)}`).join('\n');
}
function formatTicketTranscript(data){
  const messages=Array.isArray(data?.messages)?data.messages:[];
  if(!messages.length)return 'No ticket messages were found.';
  return messages.slice(-12).map(m=>`• **${safeText(m.author||'user',60)}** — ${safeText(m.content||'',300)}`).join('\n');
}
function formatActionResult(data){
  if(!data)return 'The action returned no result.';
  if(data.message)return safeText(data.message);
  if(data.state==='BLOCKED')return safeText(data.reason||'The action was blocked.');
  if(data.mode)return `Server mode changed to **${safeText(data.mode,40)}**.`;
  if(data.locked===true)return 'Channel locked.';
  if(data.locked===false)return 'Channel unlocked.';
  if(data.deleted===true)return 'Channel deleted.';
  if(Number.isFinite(Number(data.deleted)))return `Deleted **${Number(data.deleted)}** message${Number(data.deleted)===1?'':'s'}.`;
  if(data.memberId&&data.roleId)return data.removed?'Role removed.':'Role added.';
  if(data.verified===true)return 'Action completed and verified.';
  return 'Action completed.';
}
function formatToolResult(toolName,result){
  const name=String(toolName||'');
  if(name==='get_server_overview')return formatOverview(result);
  if(name==='get_smp_status')return formatSmp(result);
  if(name==='get_effective_channel_access')return formatAccess(result);
  if(name==='search_server_messages')return formatSearchResults(result);
  if(name==='search_server_knowledge')return formatKnowledge(result);
  if(name==='get_member_memory')return formatMemory(result);
  if(name==='get_recent_activity')return formatAnalytics(result?.rows||result);
  if(name==='get_actionable_analytics')return formatAnalytics(result?.data||result);
  if(name==='get_away_recap')return formatRecap(result);
  if(name==='get_audit_log')return Array.isArray(result?.entries)?result.entries.slice(0,12).map(e=>`• ${humanStatus(e.action||'Audit')} · ${safeText(e.targetName||'target',80)}`).join('\n')||'No audit entries found.':'No audit entries found.';
  if(name==='get_reports')return formatReports(result?.rows||[]);
  if(name==='get_security_incidents')return formatIncidents(result?.rows||[]);
  if(name==='get_health_diagnostic'||name==='health_check')return formatHealth(result?.rows||result||[]);
  if(name==='get_ticket_transcript')return formatTicketTranscript(result);
  if(name==='get_suggestion_themes')return Array.isArray(result?.recent)&&result.recent.length?result.recent.slice(0,8).map(r=>`• ${safeText(r.content||'',260)}`).join('\n'):'No suggestions recorded.';
  if(name==='create_suggestion')return safeText(result.message||'Suggestion recorded.');
  if(name==='create_report')return safeText(result.message||'Report submitted privately.');
  if(name==='open_ticket')return result.channelId?`Support ticket opened: <#${result.channelId}>.`:'Support ticket opened.';
  if(name==='schedule_reminder')return safeText(result.message||'Reminder scheduled.');
  if(name==='remember'||name==='forget_memory'||name==='add_knowledge')return safeText(result.message||'Updated.');
  if(name==='create_backup')return result.id?`Backup #${result.id} created.`:'Backup created.';
  if(name==='set_server_mode'||name==='assign_role'||name==='lock_channel'||name==='unlock_channel'||name==='delete_channel'||name==='purge_messages')return formatActionResult(result?.result||result);
  if(name==='get_server_relations'){
    const rel=Array.isArray(result?.relations)?result.relations:[];return rel.length?rel.slice(0,10).map(r=>`• ${safeText(r.from_type||'object',40)} ${safeText(r.relation||'related to',60)} ${safeText(r.to_type||'object',40)}`).join('\n'):'No related records found.';
  }
  if(typeof result==='string')return safeText(result);
  if(result?.message)return safeText(result.message);
  if(result?.state==='UNKNOWN')return safeText(result.reason||'The information is currently unknown.');
  if(result?.state==='FAILED')return safeText(result.message||'The operation failed.');
  return 'I retrieved the information, but there is no concise public summary for this result yet.';
}
function normalizeAiReply(text,{allowGreeting=false}={}){
  const raw=safeText(text);
  if(!raw)return raw;
  const stripped=raw.replace(/^```(?:json|text)?\s*/i,'').replace(/\s*```$/,'').trim();
  if((stripped.startsWith('{')&&stripped.endsWith('}'))||(stripped.startsWith('[')&&stripped.endsWith(']'))){
    try{return formatAnonymousObject(JSON.parse(stripped));}catch{}
  }
  if(!allowGreeting){
    const noGreeting=stripped.replace(/^(?:hello|hi|hey|hey there)[!,.]?\s+/i,'').replace(/^how can i help you today[!?]?\s*/i,'').trim();
    return noGreeting||stripped;
  }
  return stripped;
}
function formatAnonymousObject(data){
  if(!data||typeof data!=='object')return safeText(data);
  if(Array.isArray(data)){
    if(data.length&&data.every(x=>x&&typeof x==='object'&&x.edition))return formatSmp({java:data.find(x=>String(x.edition).toUpperCase()==='JAVA'),bedrock:data.find(x=>String(x.edition).toUpperCase()==='BEDROCK')});
    if(data.length&&data.every(x=>x&&typeof x==='object'&&x.event_type!==undefined&&x.c!==undefined))return formatAnalytics(data);
    if(data.length&&data.every(x=>x&&typeof x==='object'&&x.content!==undefined))return formatMemory(data);
    if(data.length&&data.every(x=>typeof x==='string'))return data.slice(0,12).map(x=>`• ${safeText(x,220)}`).join('\n');
    return 'I retrieved the information, but there is no concise public summary for it.';
  }
  if(data.java||data.bedrock)return formatSmp(data);
  if(data.members!==undefined&&data.roles!==undefined&&data.channels!==undefined)return formatOverview(data);
  if(data.activeMembers!==undefined)return formatAnalytics(data);
  if(data.items)return formatRecap(data);
  if(data.rows&&data.rows.every?.(r=>r.component&&r.status))return formatHealth(data.rows);
  if(data.message)return safeText(data.message);
  const visible=Object.entries(data).filter(([k,v])=>!INTERNAL_KEYS.has(k)&&v!==undefined&&typeof v!=='object').slice(0,8);
  return visible.length?visible.map(([k,v])=>`**${k.replace(/_/g,' ')}:** ${safeText(v,180)}`).join('\n'):'I retrieved the information, but there is no concise public summary for it.';
}
function formatControl(settings,{geminiConfigured,groqConfigured}={}){
  const flags=settings?.featureFlags||{};
  const enabled=Object.values(flags).filter(Boolean).length;
  const total=Object.keys(flags).length;
  return `**NETHRION Control Center**\nMode: **${safeText(settings?.mode||'NORMAL',40)}**\nGemini: **${geminiConfigured?'Configured':'Not configured'}**\nGroq: **${groqConfigured?'Configured':'Not configured'}**\nFeatures: **${enabled}/${total || enabled} enabled**`;
}
function actionPreview(result){
  const p=result.plan||{};
  const expires=Date.parse(result.expiresAt||'');
  const target=p.target||{};
  const targetLabel=target.name||target.role||target.member||target.channel||target.guildName||'Selected target';
  const lines=[`**${humanActionName(p.toolName)}**`,`Risk: **${String(p.risk||'unknown').toLowerCase()}**`,`Target: **${safeText(targetLabel,160)}**`,'Changes:',...((p.changes||[]).map(x=>`• ${safeText(x,240)}`))];
  if(p.sideEffects?.length)lines.push('Side effects:',...p.sideEffects.map(x=>`• ${safeText(x,240)}`));
  if(Number.isFinite(expires))lines.push('',`Expires <t:${Math.floor(expires/1000)}:R>`);
  return new EmbedBuilder().setTitle('Confirm action').setDescription(lines.join('\n')).setFooter({text:'NETHRION'});
}
function humanActionName(name='Action'){return String(name).replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase());}
function actionButtons(actionId){
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`nethrion_confirm:${actionId}`).setLabel('Confirm').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`nethrion_cancel:${actionId}`).setLabel('Cancel').setStyle(ButtonStyle.Secondary)
  );
}
module.exports={actionPreview,actionButtons,safeText,normalizeAiReply,formatToolResult,formatOverview,formatSmp,formatHealth,formatAnalytics,formatRecap,formatControl};
