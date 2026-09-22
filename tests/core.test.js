const test=require('node:test');const assert=require('node:assert/strict');
const {resolveRole,resolveMember,resolveChannel}=require('../src/resolvers/entities');
const {validateArgs,redact}=require('../src/ai/agent');
const {nextFrom}=require('../src/scheduler/service');
const {ActionEngine,RISK}=require('../src/actions/engine');

const guild={id:'g1',ownerId:'owner',channels:{cache:new Map()},roles:{cache:new Map()},members:{cache:new Map()}};
function role(id,name,position=1){return {id,name,position,managed:false,permissions:{toArray:()=>[]}}}
function member(id,name){return {id,user:{username:name},displayName:name,roles:{cache:new Map()},permissions:{has:()=>true}}}
guild.roles.cache.set('123456',role('123456','Media',3));guild.roles.cache.set('123457',role('123457','Moderator',2));guild.members.cache.set('123458',member('123458','Fahad'));guild.channels.cache.set('123459',{id:'123459',name:'general'});

test('resolver exact + conservative fuzzy behavior',()=>{
  assert.equal(resolveRole(guild,'123456').value.id,'123456');
  assert.equal(resolveRole(guild,'Media').value.id,'123456');
  assert.equal(resolveMember(guild,'123458').value.id,'123458');
  assert.equal(resolveChannel(guild,'#general').value.id,'123459');
});

test('agent validation rejects malformed tool arguments and redacts secrets',()=>{
  assert.equal(validateArgs({type:'object',properties:{n:{type:'integer'}},required:['n']},{n:1}).ok,true);
  assert.equal(validateArgs({type:'object',properties:{n:{type:'integer'}},required:['n']},{n:'1'}).ok,false);
  assert.match(redact('token=abc123 password=hello'),/REDACTED/);
});

test('scheduler supports one-shot and durable repeat intervals',()=>{
  const base=Date.parse('2026-09-22T12:00:00Z');
  assert.equal(nextFrom('in:10m',base),base+600000);
  assert.equal(nextFrom('every:60s',base),base+60000);
  assert.equal(nextFrom('2026-09-22T13:00:00Z',base),Date.parse('2026-09-22T13:00:00Z'));
});

class FakeStmt{constructor(db,sql){this.db=db;this.sql=sql;}get(...args){return this.db.get(this.sql,args);}run(...args){return this.db.run(this.sql,args);}}
class FakeDB{constructor(){this.plans=new Map();}prepare(sql){return new FakeStmt(this,sql)}get(sql,args){if(sql.includes('FROM action_plans'))return this.plans.get(args[0])||null;return null;}run(sql,args){if(sql.includes('INSERT OR REPLACE INTO action_plans')){this.plans.set(args[0],{action_id:args[0],guild_id:args[1],actor_id:args[2],tool_name:args[3],risk:args[4],plan_json:args[5],expires_at:args[6],status:args[7]});return {changes:1};}if(sql.includes("UPDATE action_plans SET status='EXPIRED'")){const p=this.plans.get(args[0]);if(p)p.status='EXPIRED';return {changes:1};}if(sql.includes("UPDATE action_plans SET status='REVERTED'")){const p=this.plans.get(args[0]);if(p)p.status='REVERTED';return {changes:1};}return {changes:1};}}

test('action engine creates a confirmation plan before high-risk execution',async()=>{
 const db=new FakeDB();const repos={getGuildSettings:()=>({mode:'NORMAL'}),addAudit:()=>{},recordAnalytics:()=>{}};const logger={warn:()=>{}};const engine=new ActionEngine({db,repos,logger,ttlSeconds:120});let executed=false;
 const member={id:'u1',permissions:{has:()=>true}};const g={id:'g1',ownerId:'owner'};
 const spec={toolName:'delete_channel',intent:'delete',risk:RISK.CRITICAL,preflight:async()=>({target:{channelId:'c1'},changes:['Delete #general']}),execute:async()=>{executed=true;},verify:async()=>({verified:true})};
 const preview=await engine.run({guild:g,member,args:{channel_id:'c1'},request:'delete #general'},spec);
 assert.equal(preview.state,'BLOCKED');assert.equal(preview.code,'CONFIRMATION_REQUIRED');assert.equal(executed,false);
 const confirmed=await engine.run({guild:g,member,args:{channel_id:'c1'},request:'confirm',actionId:preview.actionId,confirm:true},spec);
 assert.equal(confirmed.state,'SUCCESS');assert.equal(executed,true);
});

test('panel commands are real implementations, not setup placeholders',()=>{
  const fs=require('node:fs');
  const app=fs.readFileSync(require('node:path').join(__dirname,'../src/app/index.js'),'utf8');
  assert.doesNotMatch(app,/Panel creation is intentionally centralized/);
  assert.match(app,/services\.panels\.handleCommand\(message,sub\.replace\('-panel',''\)\)/);
  assert.match(app,/services\.panels\.refreshAllSmpPanels/);
});
