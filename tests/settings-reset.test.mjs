import test from 'node:test';
import assert from 'node:assert/strict';
import { host, rule } from './hooks-host.mjs';

test('explicit settings reset releases owned hooks and nodes without clearing other Mod data or owners',()=>{
  const h=host({custom:true}),{c}=h;h.load('scripts/clearCEVars.js');
  Object.assign(c.V,{sample:1,CE_customHooks:[rule('RawHook',{mode:'forceValue',value:8})],CE_otherModValue:42,CE_featBypass:true,CE_averyReqPass:true,CE_cafeBunCheat:{enabled:true},teleportation_db:[{id:'owned-node'}]});
  const runtime=c.setup.CE_addRuntimeCustomHook({type:'RawHook',path:'runtimeSample',mode:'forceValue',value:7});
  c.V.runtimeSample=1;c.setup.CE_registerCustomHookConfig(runtime);h.emit(':passagestart');
  c.RawHook.register('foreignValue',{owner:'foreign',transform:()=>99});c.V.foreignValue=1;c.RawHook.installAll();
  c.clearCEVars();
  c.V.sample=3;c.V.runtimeSample=3;c.V.foreignValue=3;
  assert.equal(c.V.sample,3);assert.equal(c.V.runtimeSample,3);assert.equal(c.V.foreignValue,99);
  assert.equal(c.V.CE_customHooks.length,0);assert.equal(c.setup.CE_runtimeCustomHooks.length,0);
  assert.equal(c.V.CE_otherModValue,42);assert.equal(Object.hasOwn(c.V,'CE_featBypass'),false);
  assert.equal(Object.hasOwn(c.V,'teleportation_db'),false);
  assert.equal(Object.hasOwn(c.V,'CE_averyReqPass'),false);assert.equal(Object.hasOwn(c.V,'CE_cafeBunCheat'),false);
  for(const engine of ['VarHook','RawHook','DeepProxyHook'])assert.equal(c.V['CE_'+engine+'_enable'],true);
  h.emit(':passagestart');assert.equal(c.V.CE_customHooks.length,0);
});

test('a trait cleanup failure does not leave the unrelated custom Hook module disabled',()=>{
  const h=host({custom:true}),{c}=h;h.load('scripts/clearCEVars.js');
  c.setup.CEClothTraitEditor={refresh(){throw Error('foreign definition cleanup');}};
  assert.throws(()=>c.clearCEVars(),/foreign definition cleanup/);
  assert.equal(c.setup.CE_features.isEnabled('custom-hooks'),true);
  for(const engine of ['VarHook','RawHook','DeepProxyHook'])assert.equal(c.V['CE_'+engine+'_enable'],true);
});
