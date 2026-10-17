import test from 'node:test';
import assert from 'node:assert/strict';
import { host, rule, enabledState } from './hooks-host.mjs';

test('Custom Hook lifecycle releases saved and runtime owners while retaining configuration and foreign rules',()=>{
  const h=host({custom:true}),{c}=h;
  Object.assign(c.V,{savedValue:1,runtimeValue:1,foreignValue:1});
  c.V.CE_customHooks=[rule('RawHook',{path:'savedValue',value:8,mode:'forceValue'})];
  const runtime=c.setup.CE_addRuntimeCustomHook({type:'RawHook',path:'runtimeValue',mode:'forceValue',value:7});
  c.setup.CE_registerCustomHookConfig(runtime);h.emit(':passagestart');
  c.RawHook.register('foreignValue',{owner:'foreign',transform:()=>99});c.RawHook.installAll();
  c.V.savedValue=2;c.V.runtimeValue=2;
  assert.equal(c.V.savedValue,8);assert.equal(c.V.runtimeValue,7);
  c.setup.CE_features.disable('custom-hooks');
  c.V.savedValue=3;c.V.runtimeValue=3;c.V.foreignValue=3;
  assert.equal(c.V.savedValue,3);assert.equal(c.V.runtimeValue,3);assert.equal(c.V.foreignValue,99);
  assert.equal(c.V.CE_customHooks.length,1);assert.equal(c.setup.CE_runtimeCustomHooks.length,1);
  h.emit(':passagestart');c.setup.CE_rebuildSavedCustomHooks();c.setup.CE_registerCustomHookConfig(runtime);
  c.V.runtimeValue=4;assert.equal(c.V.runtimeValue,4);
  c.setup.CE_features.enable('custom-hooks');c.V.savedValue=5;c.V.runtimeValue=5;
  assert.equal(c.V.savedValue,8);assert.equal(c.V.runtimeValue,7);
});

test('Custom disabled interval cannot restore a prior save rule into a newly loaded State',()=>{
  const h=host({custom:true}),{c}=h;
  c.V.sample=1;c.V.CE_customHooks=[rule('RawHook',{value:8,mode:'forceValue'})];h.emit(':passagestart');
  const old=Object.getOwnPropertyDescriptor(c.V,'sample').set;
  c.setup.CE_features.disable('custom-hooks');
  c.State.variables=enabledState({sample:10,CE_customHooks:[]});
  h.emit(':passagestart');c.setup.CE_features.enable('custom-hooks');
  c.V.sample=11;old(20);assert.equal(c.V.sample,11);assert.equal(c.V.CE_customHooks.length,0);
});
