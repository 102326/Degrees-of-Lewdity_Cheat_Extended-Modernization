import test from 'node:test';
import assert from 'node:assert/strict';
import { host } from './hooks-host.mjs';

function repairHost() {
  const h=host(),events=new Map();
  h.c.registerCE_genericTimeEvent=(type,name,fn)=>{events.set(name,fn);return true;};
  h.c.unregisterCE_genericTimeEvent=(type,name)=>events.delete(name);
  h.c.setup.clothes={upper:[{variable:'shirt',integrity:100}],newSlot:[{variable:'mod-item',integrity:80}]};
  Object.assign(h.c.V,{worn:{upper:{variable:'shirt',integrity:10},newSlot:{variable:'mod-item',integrity:5}},CE_autoRepairClothesEnabled:true,CE_autoRepairClothesRatio:0.5});
  h.load('scripts/CE_autoRepairClothes.js');h.emit(':passagestart');
  return {...h,events,repair:(ratio,slot)=>h.macroRegistry.get('CE_autoRepairClothes').handler.call({args:[ratio,slot]}),daily:()=>{for(const f of events.values())f();}};
}

test('wardrobe repair respects zero, selected slot, dynamic Mod slots and native definition ownership',()=>{
  const h=repairHost();h.repair(0);assert.equal(h.c.V.worn.upper.integrity,10);
  h.repair(0.5,'newSlot');assert.equal(h.c.V.worn.newSlot.integrity,45);assert.equal(h.c.V.worn.upper.integrity,10);
  assert.equal(h.c.setup.clothes.newSlot[0].integrity,80);
  h.repair(1,'newSlot');assert.equal(h.c.V.worn.newSlot.integrity,80);
  assert.throws(()=>h.repair(NaN),/Invalid repair ratio/);
  assert.equal(h.c.V.worn.upper.integrity,10);
});

test('wardrobe repair owns daily and passage callbacks, preserves lock policy and releases both',()=>{
  const h=repairHost();h.c.V.CE_autoRepairClothesLockSlots.upper=true;
  h.daily();assert.equal(h.c.V.worn.upper.integrity,10);assert.equal(h.c.V.worn.newSlot.integrity,45);
  h.c.V.CE_autoRepairLockEnabled=true;h.emit(':passagedisplay');assert.equal(h.c.V.worn.upper.integrity,100);
  h.c.setup.CE_features.disable('wardrobe-repair');assert.equal(h.events.size,0);
  h.c.V.worn.upper.integrity=10;h.emit(':passagedisplay');h.repair(1);
  assert.equal(h.c.V.worn.upper.integrity,10);
  h.c.setup.CE_features.enable('wardrobe-repair');assert.equal(h.events.size,1);
  h.emit(':passagedisplay');assert.equal(h.c.V.worn.upper.integrity,100);
  delete h.c.V.worn;h.daily();h.emit(':passagedisplay');
});

test('wardrobe becomes inert before clock cleanup throws, including Macro and retained callbacks',()=>{
  const h=repairHost(),{c}=h;
  let offs=0;const jq=c.$;
  c.$=target=>{const api=jq(target),off=api.off;api.off=(...args)=>{offs++;off(...args);};return api;};
  const daily=[...h.events.values()][0];
  c.V.CE_autoRepairLockEnabled=true;c.V.CE_autoRepairClothesLockSlots.upper=true;
  c.unregisterCE_genericTimeEvent=()=>{throw Error('clock deletion failed');};
  assert.throws(()=>c.setup.CE_features.disable('wardrobe-repair'),/clock deletion failed/);
  assert.equal(offs,1);assert.equal(c.setup.CE_features.isEnabled('wardrobe-repair'),false);
  daily();h.emit(':passagedisplay');h.repair(1);
  assert.equal(c.V.worn.upper.integrity,10);assert.equal(c.V.worn.newSlot.integrity,5);
  c.unregisterCE_genericTimeEvent=(type,name)=>h.events.delete(name);
  c.setup.CE_features.disable('wardrobe-repair');c.setup.CE_features.enable('wardrobe-repair');
  daily();assert.equal(c.V.worn.newSlot.integrity,5);
  h.emit(':passagedisplay');assert.equal(c.V.worn.upper.integrity,100);
});
