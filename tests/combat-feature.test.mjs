import test from 'node:test';
import assert from 'node:assert/strict';
import { host } from './hooks-host.mjs';

function combatHost(){
  const h=host(),actions=[],loads=new Set();
  h.c.T={};h.c.document.getElementById=()=>null;
  h.c.Save={onLoad:{add:fn=>loads.add(fn),delete:fn=>loads.delete(fn)}};
  h.c.maplebirch={combat:{CombatAction:{reg:action=>actions.push(action)}}};
  h.load('scripts/CE_CombatSkill.js');
  return {...h,actions,loads};
}

test('stale CE skill selection outside combat never executes an effect on page refresh',()=>{
  const h=combatHost(),{c}=h;let calls=0;
  c.setup.myModCombatSkill.reg({id:'fixture',value:'fixture-skill',actionType:['leftaction'],effect:()=>calls++});
  c.V.combat=0;c.V.leftaction='fixture-skill';h.emit(':passagestart');
  assert.equal(calls,0);
});

test('combat skill module preserves one dispatch across two selected limbs, gates definitions, and releases its resources',()=>{
  const h=combatHost(),{c}=h;let calls=0;
  c.setup.myModCombatSkill.reg({id:'fixture',value:'fixture-skill',actionType:['leftaction','rightaction'],cond:()=>true,effect:()=>calls++});
  const count=h.actions.length;
  c.V.combat=1;c.V.leftaction=c.V.rightaction='fixture-skill';h.emit(':passagestart');
  assert.equal(calls,1);assert.equal(h.loads.size,1);
  c.setup.CE_features.disable('combat-skills');
  assert.equal(h.loads.size,0);assert.ok(h.actions.every(a=>a.cond()===false));
  c.V.myModCombatSkillOnceUsed={witness:true};c.T.combatend=true;h.emit(':passagedisplay');
  assert.equal(calls,1);assert.equal(c.V.myModCombatSkillOnceUsed.witness,undefined);
  c.setup.CE_features.enable('combat-skills');h.emit(':passagestart');
  assert.equal(calls,2);assert.equal(Object.keys(c.V.myModCombatSkillOnceUsed).length,0);
  assert.equal(h.loads.size,1);assert.equal(h.actions.length,count);
});

test('once-per-battle survives toggling in the same battle but resets at a boundary while disabled',()=>{
  const h=combatHost(),{c}=h;
  c.V.combat=1;c.V.myModCombatSkillOnceUsed={witness:true};
  c.setup.CE_features.disable('combat-skills');
  h.emit(':passagestart');
  c.setup.CE_features.enable('combat-skills');
  assert.equal(c.V.myModCombatSkillOnceUsed.witness,true);
  c.setup.CE_features.disable('combat-skills');
  c.V.combat=0;c.T.combatend=true;h.emit(':passagedisplay');
  c.T.combatend=false;c.V.combat=1;
  c.setup.CE_features.enable('combat-skills');h.emit(':passagestart');
  assert.equal(c.V.myModCombatSkillOnceUsed.witness,undefined);
  c.V.myModCombatSkillOnceUsed={loaded:true};
  for(const fn of h.loads)fn({state:{}});
  assert.equal(c.V.myModCombatSkillOnceUsed.loaded,true);
});

test('native end flag produced during render is consumed before temporary state clears on navigation',()=>{
  const h=combatHost(),{c}=h;
  c.V.combat=1;c.V.myModCombatSkillOnceUsed={witness:true};
  c.setup.CE_features.disable('combat-skills');
  h.emit(':passagestart');
  c.T.combatend=true;h.emit(':passagedisplay');
  c.T={};c.V.combat=1;c.setup.CE_features.enable('combat-skills');
  h.emit(':passagestart');
  assert.equal(c.V.myModCombatSkillOnceUsed.witness,undefined);
});

test('native save-load lifecycle discards only transient combat queues, preserving saved once-per-battle flags',()=>{
  const h=combatHost(),{c}=h;
  c.V.myModCombatSkillOnceUsed={owned:true};
  c.setup.myModCombatSkill.messageQueue=['old scene'];c.setup.myModCombatSkill.defeatQueue=[0];c.setup.myModCombatSkill.defeatDamageMap={0:20};
  for(const fn of h.loads)fn({state:{}});
  assert.equal(c.setup.myModCombatSkill.messageQueue.length,0);assert.equal(c.setup.myModCombatSkill.defeatQueue.length,0);
  assert.equal(Object.keys(c.setup.myModCombatSkill.defeatDamageMap).length,0);assert.equal(c.V.myModCombatSkillOnceUsed.owned,true);
});

test('unregistering a feature leaves static native definitions safely gated without deleting them',()=>{
  const h=combatHost(),{c}=h;
  c.setup.CE_features.unregister('combat-skills');
  assert.ok(h.actions.every(a=>a.cond()===false));
  assert.equal(c.setup.CE_features.isEnabled('combat-skills'),false);
  assert.throws(()=>c.setup.CE_features.enable('combat-skills'),/Unknown feature/);
});
