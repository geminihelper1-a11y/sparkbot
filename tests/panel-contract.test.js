const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

test('panel routing is functional and placeholder-free',()=>{
  const app=fs.readFileSync(path.join(__dirname,'../src/app/index.js'),'utf8');
  const service=fs.readFileSync(path.join(__dirname,'../src/panels/service.js'),'utf8');
  assert.doesNotMatch(app,/Panel creation is intentionally centralized/);
  assert.match(app,/services\.panels\.handleCommand\(message,sub\.replace\('-panel',''\)\)/);
  assert.match(app,/services\.panels\.refreshAllSmpPanels/);
  assert.match(service,/async handleCommand\(message, key\)/);
  assert.match(service,/async ensurePanel\(guild, key, channel\)/);
  assert.match(service,/nethrion_panel:smp:refresh/);
});
