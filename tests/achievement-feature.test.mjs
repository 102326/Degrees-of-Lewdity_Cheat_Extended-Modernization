import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { host } from './hooks-host.mjs';

function achievementHost() {
  const h=host();h.load('scripts/core/CE_macroCore.js');
  const calls=[];
  const original=function(...args) {
    calls.push({locked:h.c.V.feats.locked,debug:h.c.V.debug,cheats:h.c.V.cheatsEnabled,freeze:h.c.V.statFreeze,allure:h.c.V.settings.allureModifier,receiver:this,args});
    return 'native-feat';
  };
  h.macroRegistry.set('earnFeat',{handler:original});
  Object.assign(h.c.V,{feats:{locked:true},debug:1,cheatsEnabled:true,statFreeze:true,settings:{allureModifier:0.5}});
  h.load('scripts/CE_featBypass.js');h.emit(':passagestart');
  return {...h,calls,original,macro:h.macroRegistry.get('earnFeat')};
}

test('achievement bypass temporarily opens native gates once and restores the original save lock',()=>{
  const h=achievementHost();h.c.V.CE_featBypass=true;
  const receiver={args:['actual-feat']};
  assert.equal(h.macro.handler.call(receiver,'native-arg'),'native-feat');
  assert.equal(h.calls.length,1);const call=h.calls[0];
  assert.deepEqual([call.locked,call.debug,call.cheats,call.freeze,call.allure],[false,false,false,false,1]);
  assert.equal(call.receiver,receiver);assert.deepEqual(call.args,['native-arg']);
  assert.equal(h.c.V.feats.locked,true);assert.equal(h.c.V.debug,1);assert.equal(h.c.V.cheatsEnabled,true);
  assert.equal(h.c.V.statFreeze,true);assert.equal(h.c.V.settings.allureModifier,0.5);
  h.c.setup.CE_features.disable('achievement');assert.equal(h.macro.handler,h.original);
  h.macro.handler.call(receiver);assert.equal(h.calls.at(-1).locked,true);
});

test('achievement restores captured state on native error without overwriting a newly loaded State',()=>{
  const h=achievementHost();h.c.V.CE_featBypass=true;
  const old=h.c.State.variables,next={feats:{locked:'new-save'},debug:'new-debug'};
  h.macro.handler=()=>{h.c.State.variables=next;throw Error('native-feat-error');};
  h.c.CE_MacroHook.installAll();
  assert.throws(()=>h.macro.handler.call({args:[]}),/native-feat-error/);
  assert.equal(old.feats.locked,true);assert.equal(old.debug,1);
  assert.equal(h.c.V,next);assert.equal(next.feats.locked,'new-save');assert.equal(next.debug,'new-debug');
});

test('actual hourly Patch keeps native restrictions unless this feature and its bypass are enabled',()=>{
  const h=achievementHost();
  const boot=JSON.parse(readFileSync('boot.json','utf8'));
  const patch=boot.addonPlugin.find(a=>a.modName==='ReplacePatcher').params.js.find(p=>p.TODO==='function=>patch earnHourlyFeats');
  vm.runInContext('window.hourly = function(){'+patch.to+' return true;}',h.c);
  h.c.V.gamemode='normal';h.c.V.replayScene=false;
  h.c.V.CE_featBypass=false;assert.equal(h.c.hourly(),false);
  h.c.V.CE_featBypass=true;assert.equal(h.c.hourly(),true);
  h.c.V.gamemode='soft';assert.equal(h.c.hourly(),false);
  h.c.V.gamemode='normal';h.c.V.replayScene=true;assert.equal(h.c.hourly(),false);
  h.c.V.replayScene=false;h.c.setup.CE_features.disable('achievement');assert.equal(h.c.hourly(),false);
});
