import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { host, enabledState, baseline } from './hooks-host.mjs';

const boot=JSON.parse(readFileSync('boot.json','utf8'));
const moneyPatch=boot.addonPlugin.find(a=>a.modName==='ReplacePatcher').params.js.find(p=>p.TODO==='function=>hook money');
function moneyHost({exported=true,patchCopies=1}={}) {
  const h=host(),{c,macroRegistry}=h;
  const loads=new Set(),events=new Map(),writes=[];
  c.Wikifier={wikifyEval(text){
    const match=/^<<money ([\d.eE+-]+) unknown>>$/.exec(text);
    if(!match)throw Error('Only reviewed money Macro syntax is supported');
    return macroRegistry.get('money').handler.call({args:[Number(match[1]),'unknown']});
  }};
  c.Save={onLoad:{add:fn=>loads.add(fn),delete:fn=>loads.delete(fn)}};
  c.SugarCube=exported?{Save:c.Save}:{};
  c.nativeMoney=function(amount,source,optional={}) {
    writes.push({amount,source,optional,receiver:this});
    if(!optional.recordOnly) {
      if(amount<0 && c.V.money+Number(amount)<0)throw Error('insufficient funds');
      c.V.money+=Number(amount);
    }
    const stats=c.V.moneyStats ??= {earned:0,spent:0,earnedCount:0,spentCount:0};
    const type=amount>0?'earned':'spent';stats[type]+=Math.abs(Number(amount));stats[type+'Count']++;
    return 'native-result';
  };
  c.registerCE_genericTimeEvent=(type,name,fn)=>{events.set(name,fn);return true;};
  c.unregisterCE_genericTimeEvent=(type,name)=>events.delete(name);
  const state=money=>enabledState({money,CE_moneyCheat:true,CE_moneyInMultiplier:2,CE_moneyOutMultiplier:0.5,CE_moneyWatchEnabled:true});
  c.State.variables=state(100);
  vm.runInContext(`(()=>{function money(...args){return nativeMoney.apply(this,args);}
    function DefineMacro(name,fn){Macro.add(name,{handler(){return fn.apply(this,this.args);}});}
    ${Array(patchCopies).fill(moneyPatch.to).join('\n')}
    window.statChange={money};})()`,c);
  h.load('scripts/CE_MoneyCheat.js');h.emit(':passagestart');
  return {...h,writes,loads,events,state,tick:()=>events.get('CE_money_Watch')?.(),load(money){
    for(const fn of loads)fn({state:{}});
    c.State.variables=state(money);h.emit(':passagestart');
  }};
}

// This Git blob is byte-identical to the author's 1.20.3.1 release script.
const legacySource=execFileSync('git',['show',`${baseline}:scripts/CE_MoneyCheat.js`],{encoding:'utf8'});
function legacyMoneyHost() {
  const h=moneyHost();h.c.money=h.c.nativeMoney;h.c.V.CE_moneyWatchEnabled=false;
  const start=legacySource.indexOf('macro.handler = function()');
  const end=legacySource.indexOf('console.log("[Cheat Extended] ✅ Money macro handler',start);
  const camel=legacySource.match(/const toCamelCaseLocal = str =>[\s\S]+?;\s/)[0];
  vm.runInContext(`(()=>{const macro=Macro.get('money');${camel}\n${legacySource.slice(start,end)}})()`,h.c);
  return h;
}

function legacyWatchHost() {
  const h=legacyMoneyHost();h.c.V.CE_moneyWatchEnabled=true;
  h.c.modUtils={getLogger:()=>h.c.console,getMod:name=>name==='maplebirch'?{}:undefined};
  h.c.maplebirch={dynamic:{regTimeEvent:(type,name,event)=>h.events.set(name,event.action)}};
  const start=legacySource.lastIndexOf('(function ()',legacySource.indexOf('window.CE_moneyWatch = function'));
  const end=legacySource.indexOf('registerMoneyWatchEvent();')+'registerMoneyWatchEvent();'.length;
  vm.runInContext(legacySource.slice(start,end),h.c);
  return h;
}

for(const [name,run] of [
  ['raw income',h=>{h.c.V.money+=10;}],['raw expense',h=>{h.c.V.money-=10;}],
  ['opposing raw writes',h=>{h.c.V.money+=100;h.c.V.money-=80;}],
  ['raw and Macro mixed',h=>{h.c.V.money+=100;h.macroRegistry.get('money').handler.call({args:[10,'known']});h.c.V.money-=80;}],
  ['multipliers off',h=>{h.c.V.CE_moneyCheat=false;h.c.V.money+=10;}],
])test(`author Watch parity: ${name}`,()=>{
  const old=legacyWatchHost(),current=moneyHost();
  for(const h of [old,current]){h.tick();run(h);h.tick();h.tick();}
  assert.equal(current.c.V.money,old.c.V.money);
  assert.deepEqual({...current.c.V.moneyStats},{...old.c.V.moneyStats});
  assert.equal(current.writes.length,old.writes.length);
});

test('intentional legacy exception: native direct calls are not booked twice',()=>{
  const old=legacyWatchHost(),current=moneyHost();
  for(const h of [old,current]){h.tick();h.c.money(10,'native');h.tick();}
  assert.equal(old.c.V.money,120);assert.equal(current.c.V.money,120);
  assert.equal(old.c.V.moneyStats.earned,30);assert.equal(old.writes.length,2);
  assert.equal(current.c.V.moneyStats.earned,20);assert.equal(current.writes.length,1);
});

test('intentional legacy exception: recordOnly does not invent a raw expense and extra balance',()=>{
  const old=legacyWatchHost(),current=moneyHost();
  for(const h of [old,current]){h.tick();h.macroRegistry.get('money').handler.call({args:[10,'record',{recordOnly:true}]});h.tick();}
  assert.equal(old.c.V.money,110);assert.equal(old.writes.length,2);
  assert.equal(current.c.V.money,100);assert.equal(current.writes.length,1);
  assert.equal(current.c.V.moneyStats.earned,20);assert.equal(current.c.V.moneyStats.spent,0);
});

for(const [name,input,options,source='source_name'] of [
  ['income',10,undefined],['expense',-10,undefined],['numeric string','10',undefined],
  ['boolean amount',true,undefined],['record-only income',10,{recordOnly:true}],
  ['record-only expense',-10,{recordOnly:true}],['null options',10,null],['false options',10,false],
  ['numeric source',10,undefined,17],['boxed source',10,undefined,new String('source_name')],
])test(`author Macro parity: ${name}`,()=>{
  const old=legacyMoneyHost(),current=moneyHost();current.c.V.CE_moneyWatchEnabled=false;
  for(const h of [old,current])h.macroRegistry.get('money').handler.call({args:[input,source,options&&{...options}]});
  assert.equal(current.c.V.money,old.c.V.money);
  assert.deepEqual({...current.c.V.moneyStats},{...old.c.V.moneyStats});
  assert.equal(current.writes[0]?.amount,old.writes[0]?.amount);
  assert.equal(current.writes[0]?.source,old.writes[0]?.source);
  assert.equal(typeof current.writes[0]?.optional,typeof old.writes[0]?.optional);
});

test('raw routing goes through the existing controlled Macro including third-party wrappers',()=>{
  const h=moneyHost();h.tick();let calls=0;
  const macro=h.macroRegistry.get('money'),previous=macro.handler;
  const wrapper=function(){calls++;return previous.apply(this,arguments);};macro.handler=wrapper;
  h.c.V.money+=10;h.tick();h.tick();
  assert.equal(calls,1);assert.equal(h.c.V.money,120);assert.equal(h.c.V.moneyStats.earned,20);
  h.c.setup.CE_features.disable('money');assert.equal(macro.handler,wrapper);
});

test('controlled Macro failure after native bookkeeping pauses without repeating side effects',()=>{
  const h=moneyHost();h.tick();const macro=h.macroRegistry.get('money'),previous=macro.handler;
  macro.handler=function(){previous.apply(this,arguments);throw Error('Macro wrapper after stats');};
  h.c.V.money+=10;h.tick();h.tick();
  assert.equal(h.c.V.money,120);assert.equal(h.c.V.moneyStats.earned,20);assert.equal(h.writes.length,1);
  assert.equal(h.c.CE_moneyWatch.error,'Macro wrapper after stats');
});

test('author Macro numeric objects convert once; native return, option identity and legacy marker survive',()=>{
  for(const create of [legacyMoneyHost,moneyHost]){
    const h=create();let conversions=0;const input={valueOf(){conversions++;return 10;}};
    const result=h.macroRegistry.get('money').handler.call({args:[input,'source_name']});
    assert.equal(h.c.V.money,120);assert.equal(conversions,1);
    if(create===moneyHost)assert.equal(result,'native-result');
  }
  const h=moneyHost(),options=Object.freeze({recordOnly:true});
  h.macroRegistry.get('money').handler.call({args:[10,'frozen',options]});
  assert.equal(h.c.V.money,100);assert.equal(h.c.V.moneyStats.earned,20);
  assert.equal(Object.hasOwn(options,'_CE_macroTriggered'),false);
  const mutable={recordOnly:true};
  h.macroRegistry.get('money').handler.call({args:[10,'mutable',mutable]});
  assert.equal(h.writes.at(-1).optional,mutable);assert.equal(mutable._CE_macroTriggered,true);
});

test('native load resets Money observation without replaying another save balance',()=>{
  const h=moneyHost();h.tick();h.load(1000);h.tick();
  assert.equal(h.c.V.money,1000);assert.equal(h.writes.length,0);
});

test('the real Patch scales Macro and direct native calls once, retaining source, receiver and result',()=>{
  const h=moneyHost();h.tick();
  h.macroRegistry.get('money').handler.call({args:[10,'source_name']});
  assert.equal(h.c.V.money,120);assert.equal(h.writes.length,1);
  assert.equal(h.writes[0].source,'sourceNameModifiedByCE');
  h.tick();assert.equal(h.c.V.money,120);assert.equal(h.writes.length,1);
  const receiver={marker:7};
  assert.equal(h.c.statChange.money.call(receiver,10,'direct'),'native-result');
  assert.equal(h.c.V.money,140);assert.equal(h.writes.length,2);assert.equal(h.writes[1].receiver,receiver);
  h.tick();assert.equal(h.writes.length,2);
  h.macroRegistry.get('money').handler.call({args:[-10,'cost']});
  assert.equal(h.c.V.money,135);assert.equal(h.writes.length,3);
});

test('Money Watch routes direct income and spending once through native bookkeeping',()=>{
  const h=moneyHost();h.tick();
  h.c.V.money+=10;h.tick();h.tick();
  assert.equal(h.c.V.money,120);assert.equal(h.writes.length,1);
  assert.equal(h.writes[0].source,'unknownModifiedByCE');
  assert.equal(h.c.V.moneyStats.earned,20);assert.equal(h.c.V.moneyStats.earnedCount,1);
  h.c.V.money-=10;h.tick();h.tick();
  assert.equal(h.c.V.money,115);assert.equal(h.writes.length,2);
  assert.equal(h.c.V.moneyStats.spent,5);assert.equal(h.c.V.moneyStats.spentCount,1);
});

test('raw changes are a sampled net amount; mixed native calls are excluded',()=>{
  const h=moneyHost();h.tick();
  h.c.V.money+=100;h.c.money(10,'native');h.c.V.money-=80;h.tick();h.tick();
  assert.equal(h.c.V.money,160);assert.equal(h.writes.length,2);
  assert.equal(h.c.V.moneyStats.earned,60);assert.equal(h.c.V.moneyStats.spent,0);
  assert.equal(h.writes[1].amount,40);
});

test('raw routing still records native stats with multipliers disabled',()=>{
  const h=moneyHost();h.c.V.CE_moneyCheat=false;h.tick();
  h.c.V.money+=10;h.tick();h.c.V.money-=5;h.tick();
  assert.equal(h.c.V.money,105);assert.equal(h.writes.length,2);
  assert.equal(h.c.V.moneyStats.earned,10);assert.equal(h.c.V.moneyStats.spent,5);
});

test('State replacement without onLoad and explicit load both rebuild the baseline',()=>{
  const h=moneyHost();h.tick();h.c.V.money+=10;
  h.c.State.variables=h.state(1000);h.tick();assert.equal(h.writes.length,0);
  h.c.V.money+=5;h.tick();assert.equal(h.c.V.money,1010);
  h.load(2000);h.tick();assert.equal(h.c.V.money,2000);assert.equal(h.writes.length,1);
});

test('disable, re-enable and the UI reset do not settle inactive changes',()=>{
  const h=moneyHost();h.tick();h.c.V.money+=10;
  h.c.V.CE_moneyWatchEnabled=false;h.tick();h.c.V.money+=40;
  h.c.V.CE_moneyWatchEnabled=true;h.tick();assert.equal(h.writes.length,0);
  h.c.V.money+=5;h.c.CE_moneyWatch.reset();h.tick();assert.equal(h.writes.length,0);
  const stale=h.events.get('CE_money_Watch');h.c.setup.CE_features.disable('money');
  h.c.V.money+=50;stale();h.c.setup.CE_features.enable('money');h.tick();
  assert.equal(h.c.V.money,205);assert.equal(h.writes.length,0);
  h.c.V.money+=10;h.tick();assert.equal(h.c.V.money,225);assert.equal(h.writes.length,1);
});

test('nested boundaries scale and account once, while replay tick reentry is inert',()=>{
  const h=moneyHost();h.tick();const original=h.c.nativeMoney;let nested=false;
  h.c.nativeMoney=function(...args){
    h.tick();
    if(!nested){nested=true;try{return h.c.money(...args);}finally{nested=false;}}
    return original.apply(this,args);
  };
  assert.equal(h.c.money(10,'nested'),'native-result');h.tick();
  assert.equal(h.c.V.money,120);assert.equal(h.writes.length,1);
  h.c.V.money+=5;h.tick();h.tick();
  assert.equal(h.c.V.money,130);assert.equal(h.writes.length,2);
});

test('partial native failure is visible, retains effects and latches replay off',()=>{
  const h=moneyHost();h.tick();const original=h.c.nativeMoney;
  h.c.nativeMoney=function(...args){original.apply(this,args);throw Error('after stats');};
  h.c.V.money+=10;h.tick();
  assert.equal(h.c.V.money,120);assert.equal(h.c.V.moneyStats.earned,20);
  assert.equal(h.c.CE_moneyWatch.error,'after stats');
  h.c.V.money+=5;h.tick();h.tick();assert.equal(h.writes.length,1);assert.equal(h.c.V.money,125);
  h.c.nativeMoney=original;h.c.CE_moneyWatch.reset();h.tick();
  h.c.V.money+=5;h.tick();assert.equal(h.c.V.money,135);assert.equal(h.writes.length,2);
});

test('native insufficient funds is preserved, while invalid sampled values stop before replay',()=>{
  const h=moneyHost();h.c.V.CE_moneyCheat=false;h.tick();
  h.c.V.money=-10;h.tick();assert.equal(h.c.V.money,100);
  assert.equal(h.c.V.moneyStats,undefined);assert.match(h.c.CE_moneyWatch.error,/insufficient/);
  h.tick();assert.equal(h.writes.length,1);
  const z=moneyHost();z.tick();z.c.V.money=Infinity;z.tick();z.tick();
  assert.equal(z.writes.length,0);assert.match(z.c.CE_moneyWatch.error,/Non-finite/);
});

test('fractional, zero and free-spending changes retain native numeric rules',()=>{
  const h=moneyHost();h.tick();h.c.V.money+=5;h.c.V.money-=5;h.tick();
  assert.equal(h.writes.length,0);
  h.c.V.money-=0.5;h.tick();assert.equal(h.c.V.money,99.75);assert.equal(h.c.V.moneyStats.spent,0.25);
  h.c.V.CE_moneyOutMultiplier=0;h.c.V.money-=5;h.tick();h.tick();
  assert.equal(h.c.V.money,99.75);assert.equal(h.writes.length,2);
});

test('Money Watch preserves third-party accessors and rejects a blocked reconstruction',()=>{
  const h=moneyHost();let balance=100;
  const get=()=>balance,set=n=>{balance=n;};
  Object.defineProperty(h.c.V,'money',{get,set,enumerable:true,configurable:true});h.tick();
  h.c.V.money+=10;h.tick();assert.equal(balance,120);assert.equal(h.c.V.moneyStats.earned,20);
  h.c.setup.CE_features.disable('money');
  const descriptor=Object.getOwnPropertyDescriptor(h.c.V,'money');assert.equal(descriptor.get,get);assert.equal(descriptor.set,set);
  const b=moneyHost();b.tick();b.c.V.money+=10;
  Object.defineProperty(b.c.V,'money',{get:()=>110,set(){},enumerable:true,configurable:true});
  b.tick();b.tick();assert.equal(b.writes.length,0);assert.equal(b.c.V.money,110);
  assert.match(b.c.CE_moneyWatch.error,/Hook rejected/);
});

test('Money Watch coexists with CE Raw Hooks without changing their registration',()=>{
  const h=moneyHost();
  h.c.RawHook.register('money',{transform:ctx=>ctx.newValue});h.c.RawHook.installAll();
  const before=Object.getOwnPropertyDescriptor(h.c.V,'money');h.tick();h.c.V.money+=10;h.tick();
  assert.equal(h.c.V.money,120);assert.equal(h.c.V.moneyStats.earned,20);
  const after=Object.getOwnPropertyDescriptor(h.c.V,'money');assert.equal(after.get,before.get);assert.equal(after.set,before.set);
  h.c.setup.CE_features.disable('money');assert.equal(Object.getOwnPropertyDescriptor(h.c.V,'money').set,before.set);
  h.c.RawHook.unregister('money');
});

test('Money cleanup removes only its bridge and observers, preserving the native Macro',()=>{
  const h=moneyHost();h.tick();const macro=h.macroRegistry.get('money').handler;
  const stale=h.c.CE_moneyTransaction;
  assert.equal(h.loads.size,1);assert.equal(h.events.size,1);
  h.c.setup.CE_features.disable('money');
  assert.equal(h.loads.size,0);assert.equal(h.events.size,0);assert.equal(h.c.CE_moneyTransaction,undefined);
  assert.equal(h.macroRegistry.get('money').handler,macro);
  macro.call({args:[10,'native']});assert.equal(h.c.V.money,110);
  stale(h.c.nativeMoney,null,[10,'stale']);assert.equal(h.c.V.money,120);
  h.emit(':passagestart');assert.equal(h.events.size,0);
  h.c.setup.CE_features.enable('money');
  assert.equal(h.loads.size,1);assert.equal(h.events.size,1);
  macro.call({args:[10,'native']});assert.equal(h.c.V.money,140);
});

test('Macro recordOnly scales like the author; direct native recordOnly remains native and neither replays',()=>{
  const h=moneyHost();h.tick();
  h.macroRegistry.get('money').handler.call({args:[10,'record',{recordOnly:true}]});h.tick();
  assert.equal(h.c.V.money,100);assert.equal(h.writes.length,1);assert.equal(h.writes[0].amount,20);
  h.c.money(10,'native-record',{recordOnly:true});h.tick();
  assert.equal(h.c.V.money,100);assert.equal(h.writes.length,2);assert.equal(h.writes[1].amount,10);
});

test('Money starts before SugarCube window exports and repeated Patch application cannot multiply twice',()=>{
  const h=moneyHost({exported:false,patchCopies:2});
  assert.equal(h.c.setup.CE_features.isEnabled('money'),true);
  assert.equal(h.loads.size,1);assert.equal(h.events.size,1);
  h.c.money(10,'startup');assert.equal(h.c.V.money,120);assert.equal(h.writes.length,1);
});

test('native optional getters execute once and native errors keep their original partial effects',()=>{
  const h=moneyHost();let gets=0;
  h.c.money(10,'accessor',{get recordOnly(){gets++;return true;}});
  assert.equal(gets,1);assert.equal(h.c.V.money,100);assert.equal(h.writes[0].amount,10);
  h.c.nativeMoney=function(amount){h.c.V.money+=amount;throw Error('native failure');};
  assert.throws(()=>h.c.money(10,'failure'),/native failure/);
  assert.equal(h.c.V.money,120);
  h.tick();assert.equal(h.c.V.money,120);
});

test('Money becomes inert before a throwing clock cleanup, releases other resources and retries',()=>{
  const h=moneyHost(),{c}=h;
  const tick=h.events.get('CE_money_Watch'), stale=c.CE_moneyTransaction;
  h.tick();
  c.unregisterCE_genericTimeEvent=()=>{throw Error('clock deletion failed');};
  assert.throws(()=>c.setup.CE_features.disable('money'),/clock deletion failed/);
  assert.equal(c.setup.CE_features.isEnabled('money'),false);
  assert.equal(h.loads.size,0);assert.equal(c.CE_moneyTransaction,undefined);
  c.V.money+=1;tick();assert.equal(h.warnings.length,0);
  stale(c.nativeMoney,null,[10,'stale']);assert.equal(c.V.money,111);
  c.money(10,'native');assert.equal(c.V.money,121);
  c.unregisterCE_genericTimeEvent=(type,name)=>h.events.delete(name);
  c.setup.CE_features.disable('money');c.setup.CE_features.enable('money');
  c.money(10,'enabled');assert.equal(c.V.money,141);
  c.V.money+=1;tick();assert.equal(h.warnings.length,0);
  assert.equal(h.loads.size,1);assert.equal(h.events.size,1);
});
