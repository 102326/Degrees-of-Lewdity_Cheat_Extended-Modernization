import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { host } from './hooks-host.mjs';

test('purity keeps configured arithmetic for Macro and JS, restores native validation and releases both boundaries',()=>{
  const h=host(),{c,macroRegistry}=h;h.load('scripts/core/CE_macroCore.js');
  vm.runInContext('Math.clamp = (v,min,max) => Math.min(Math.max(v,min),max)',c);
  let calls=0;const native=function(amount){calls++;if(isNaN(amount))throw Error('native-purity-input');return amount;};
  macroRegistry.set('purity',{handler(){return native(...this.args);}});c.statChange={purity:native};
  c.V.purity=100;c.V.worn={upper:{type:['holy']}};h.load('scripts/CE_purityControl.js');h.emit(':passagestart');
  c.V.CE_purityControl=true;c.V.CE_purityAddMultiplier=2;c.V.CE_puritySubMultiplier=3;
  c.statChange.purity(5);assert.equal(c.V.purity,120);assert.equal(calls,0);
  macroRegistry.get('purity').handler.call({args:[-5]});assert.equal(c.V.purity,90);assert.equal(calls,0);
  assert.throws(()=>c.statChange.purity('invalid'),/native-purity-input/);
  const old=c.statChange.purity;c.setup.CE_features.disable('purity');
  assert.equal(c.statChange.purity,native);assert.equal(old(5),5);
  macroRegistry.get('purity').handler.call({args:[3]});assert.equal(calls,3);
  c.setup.CE_features.enable('purity');c.V.CE_purityMax=105;c.statChange.purity(10);assert.equal(c.V.purity,105);
});

test('parasite delegates once with original boolean chance, receiver and lock, keeping five log entries',()=>{
  const h=host(),{c,macroRegistry}=h;h.load('scripts/core/CE_macroCore.js');
  c.clone=x=>structuredClone(x);c.Time={days:1};
  const calls=[];const native=function(arg){calls.push([this.args[1],this.marker,arg,c.setup.CE_macroLock]);return 'native-parasite';};
  macroRegistry.set('impregnateParasite',{handler:native});
  h.load('scripts/CE_parasiteControl.js');h.emit(':passagestart');
  c.V.CE_parasiteMultiplierEnable=true;c.V.CE_parasiteMultiplier=2;c.setup.CE_macroLock='outer';
  for(let i=0;i<6;i++)assert.equal(macroRegistry.get('impregnateParasite').handler.call({args:['type',10,'anus'],marker:7},'extra'),'native-parasite');
  assert.deepEqual(calls[0],[20,7,'extra','outer']);assert.equal(c.V.CE_parasiteMultiplierLog.length,5);
  macroRegistry.get('impregnateParasite').handler.call({args:['type',true]});assert.equal(calls.at(-1)[0],true);
  c.setup.CE_features.disable('parasite');assert.equal(macroRegistry.get('impregnateParasite').handler,native);
  assert.equal(c.V.CE_parasiteMultiplierLog.length,5);
});

test('actual max-parasite Patch stops overriding native limits when its module is released',()=>{
  const h=host(),{c}=h;h.load('scripts/core/CE_macroCore.js');c.clone=x=>x;c.Time={days:1};
  h.load('scripts/CE_parasiteControl.js');h.emit(':passagestart');
  const boot=JSON.parse(readFileSync('boot.json','utf8'));
  const p=boot.addonPlugin.find(a=>a.modName==='ReplacePatcher').params.js.find(p=>p.TODO==='patch => maxParasites');
  vm.runInContext('window.limit = function(orifice){'+p.to+' { default: return 2; }}',c);
  c.V.CE_parasiteControl=true;c.V.CE_parasiteMaxAnus=7;c.V.sexStats={anus:{pregnancy:{motherStatus:0,fetus:[1,2,3]}}};
  assert.equal(c.limit('anus'),7);c.V.CE_parasiteUnlimited=true;assert.equal(c.limit('anus'),4);
  c.setup.CE_features.disable('parasite');assert.equal(c.limit('anus'),2);
});
