import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

async function guard(version, bridge, {managed=true}={}) {
  let hook,now=0;const alerts=[],writes=[],rich=[],logs=[];
  let enabled=managed?['foreign','cheat extended']:['foreign'],hidden=['hidden-foreign'];
  const ctl={addLifeTimeCircleHook(name,value){hook=value;},listModIndexDB:async()=>enabled,loadHiddenModList:async()=>hidden,
    async overwriteModIndexDBModList(value){enabled=value;writes.push(['enabled',value]);},
    async overwriteModIndexDBHiddenModList(value){hidden=value;writes.push(['hidden',value]);}};
  const c=vm.createContext({StartConfig:{version},console,alert:value=>alerts.push(value),
    Date:{now:()=>{const current=now;now+=300001;return current;}},setTimeout,
    modSC2DataManager:{getModLoadController:()=>ctl},modUtils:{getModLoadController:()=>ctl,getLogger:()=>({log:()=>{},warn:value=>logs.push(value),error:value=>logs.push(value)})}});
  c.window=c;
  if(bridge==='valid')c.modSweetAlert2Mod={fire(options){assert.equal(this,c.modSweetAlert2Mod);rich.push(options);}};
  else if(bridge!=='missing')c.modSweetAlert2Mod=bridge;
  vm.runInContext(readFileSync('scriptEarly/CE_environmentGuard.js','utf8'),c);
  await hook.ModLoaderLoadEnd();await new Promise(setImmediate);
  return {alerts,writes,rich,logs,enabled,hidden};
}

for(const bridge of ['valid','missing',{}, {fire:true}]) {
  const label=typeof bridge==='string'?bridge:JSON.stringify(bridge);
  test(`environment mismatch with ${label} notification keeps disable result and next-step information`,async()=>{
    const h=await guard('DoLP 0.5.12.13',bridge);
    assert.deepEqual(Array.from(h.enabled),['foreign']);assert.deepEqual(Array.from(h.hidden),['hidden-foreign','cheat extended']);
    assert.equal(h.writes.length,2);
    if(bridge==='valid') {
      assert.equal(h.alerts.length,0);assert.equal(h.rich.length,1);
      assert.match(h.rich[0].html,/已自動加入/);assert.match(h.rich[0].html,/CheatExpansion for DolPlus/);
    }else {
      assert.equal(h.alerts.length,1);assert.match(h.alerts[0],/已自動加入/);
      assert.match(h.alerts[0],/CheatExpansion for DolPlus/);assert.match(h.alerts[0],/安裝正確版本/);
    }
  });
  test(`unknown environment with ${label} notification never edits Mod lists`,async()=>{
    const h=await guard('',bridge);assert.equal(h.writes.length,0);
    if(bridge==='valid') {
      assert.equal(h.rich.length,1);assert.match(h.rich[0].html,/不會自動禁用/);
    }else {assert.equal(h.alerts.length,1);assert.match(h.alerts[0],/不會自動禁用/);assert.match(h.alerts[0],/自行確認/);}
  });
}
test('missing optional notification does not create a load warning in a valid game',async()=>{
  const h=await guard('0.5.12.13','missing');assert.equal(h.writes.length,0);assert.equal(h.alerts.length,0);assert.equal(h.rich.length,0);
});
test('fallback retains the manual-disable outcome when CE is not manageable',async()=>{
  const h=await guard('DoLP 0.5.12.13',{}, {managed:false});
  assert.equal(h.writes.length,0);assert.match(h.alerts[0],/無法自動禁用/);assert.match(h.alerts[0],/手動處理/);
});
