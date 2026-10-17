import test from 'node:test';
import assert from 'node:assert/strict';
import { host } from './hooks-host.mjs';

function clockHost(){
  const h=host(),events=new Map(),calls=[];
  const dynamic={
    regTimeEvent(type,name,options){if(events.has(name)||name==='reject')return false;events.set(name,{type,...options});calls.push([type,name]);return true;},
    delTimeEvent(type,name){return events.delete(name);}
  };
  h.c.maplebirch={dynamic};h.c.Time={weekDay:3};h.c.random=()=>1;
  h.load('scripts/CE_Time_Event.js');
  return {...h,events,calls,dynamic};
}

test('real daily consumers preserve native event types, order, state formula and scoped cleanup',()=>{
  const h=clockHost(),{c}=h;
  for(const file of ['CE_forceAttendSchool.js','CE_nectarKeeper.js','CE_TransformationDG.js','CE_brothelBasementManager.js'])h.load('scripts/'+file);
  assert.equal(h.events.size,13);
  assert.deepEqual(h.calls.slice(0,3),[['onAfter','CE_自動調溫'],['onDay','CE_額外狀態恢復'],['onDay','CE_forceAttendSchool']]);
  assert.equal(h.calls.filter(([t])=>t==='onDay').length,12);
  Object.assign(c.V,{swich_extraStatusRestore:true,pain:100,control:900,daily:{school:{}},CE_forceAttendSchool:1,CE_nectarKeeperEnabled:true,
    backgroundTraits:['plantlover'],nectar_timer:2,CE_angelBuildDailyGainEnabled:true,CE_angelBuildDailyGainAmount:10,angelbuild:97,
    brothel_basement_switch:true,brothel_basement_multiplier:2});
  for(const event of h.events.values())if(event.type==='onDay')event.action();
  assert.equal(c.V.pain,50);assert.equal(c.V.control,950);
  assert.equal(c.V.daily.school.attended.housekeeping,1);assert.equal(c.V.daily.school.attended.maths,undefined);
  assert.equal(c.V.nectar_timer,3);assert.equal(c.V.angelbuild,100);assert.equal(c.V.brothel_basement_price,10000);
  h.events.set('foreign',{type:'onDay',action(){}});
  const ids=['daily-status','school-attendance','nectar-keeper','transformation-daily','basement-rewards'];
  for(const id of ids)c.setup.CE_features.disable(id);
  assert.deepEqual([...h.events.keys()],['foreign']);
  for(const id of ids)c.setup.CE_features.enable(id);
  assert.equal(h.events.size,14);
});

test('clock feature rolls back partial registration and attempts every owned cleanup on failure',()=>{
  const h=clockHost(),{c}=h;
  assert.throws(()=>c.registerCE_timeFeature('partial',[['onDay','first',()=>{}],['onDay','reject',()=>{}]]),/Clock registration failed/);
  assert.equal(c.setup.CE_features.isEnabled('partial'),false);assert.equal(h.events.has('first'),false);assert.equal(h.events.size,2);
  c.registerCE_timeFeature('cleanup',[['onDay','owned-a',()=>{}],['onDay','owned-b',()=>{}]]);
  const del=h.dynamic.delTimeEvent;h.dynamic.delTimeEvent=(type,name)=>{if(name==='owned-a')throw Error('provider cleanup');return del(type,name);};
  assert.throws(()=>c.setup.CE_features.disable('cleanup'),/provider cleanup/);
  assert.equal(h.events.has('owned-b'),false);assert.equal(c.setup.CE_features.isEnabled('cleanup'),false);
  assert.equal(c.setup.CE_features.enable('cleanup'),false); // Cleanup handle is retained for retry.
  h.dynamic.delTimeEvent=del;c.setup.CE_features.disable('cleanup');assert.equal(h.events.has('owned-a'),false);
});

test('failed initialization cleanup cannot leave an active business callback in the provider',()=>{
  const h=clockHost(),{c}=h;let calls=0;
  const del=h.dynamic.delTimeEvent;h.dynamic.delTimeEvent=(type,name)=>{if(name==='left-behind')throw Error('provider refused cleanup');return del(type,name);};
  assert.throws(()=>c.registerCE_timeFeature('failed-cleanup',[['onDay','left-behind',()=>calls++],['onDay','reject',()=>{}]]),/initialization failed/);
  assert.equal(c.setup.CE_features.isEnabled('failed-cleanup'),false);
  h.events.get('left-behind').action();assert.equal(calls,0);
});

test('clock wrapper preserves native receiver, arguments and return, and held callbacks retire on release',()=>{
  const h=clockHost(),{c}=h;const receiver={marker:7};let calls=0;
  c.registerCE_timeFeature('context',[['onDay','context-event',function(arg){calls++;assert.equal(this,receiver);assert.equal(arg,3);return 42;}]]);
  const held=h.events.get('context-event').action;
  assert.equal(held.call(receiver,3),42);c.setup.CE_features.disable('context');
  assert.equal(held.call(receiver,3),undefined);assert.equal(calls,1);
});
