import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { host, enabledState } from './hooks-host.mjs';

function timeHost() {
  const h=host();h.load('scripts/core/CE_macroCore.js');
  const calls=[];
  const original=function(...args){calls.push({value:this.args[0],extra:this.args[1],lock:h.c.setup.CE_macroLock,receiver:this,args});return 'native-time';};
  h.macroRegistry.set('pass',{handler:original});
  h.load('scripts/CE_timeMultiplier.js');h.emit(':passagestart');
  return {...h,calls,original,macro:h.macroRegistry.get('pass')};
}

test('Time preserves baseline rounding and native lock, receiver, extra arguments and result',()=>{
  const h=timeHost(),old=host();
  const values=[];
  old.macroRegistry.set('pass',{handler(){values.push(this.args[0]);}});
  vm.runInContext(execFileSync('git',['show','0a56aa4:scripts/CE_timeMultiplier.js'],{encoding:'utf8'}),old.c);
  for(const [input,mult] of [[2,2],[1,0.5],[7,0],[3,1.5],[undefined,2]]) {
    for(const ctx of [h.c,old.c]){ctx.V.CE_timePassMultiplier=true;ctx.V.CE_timeMultiplier=mult;}
    const receiver={args:[input,'native-extra']};h.c.setup.CE_macroLock='caller';
    assert.equal(h.macro.handler.call(receiver,'JS-extra'),'native-time');
    old.macroRegistry.get('pass').handler.call({args:[input]});
    const actual=h.calls.at(-1);
    assert.equal(actual.value,values.at(-1));assert.equal(actual.extra,'native-extra');
    assert.equal(actual.receiver,receiver);assert.deepEqual(actual.args,['JS-extra']);assert.equal(actual.lock,'caller');
  }
});

test('Time releases only its owner, keeps disabled aliases inert, and rebinds after State replacement',()=>{
  const h=timeHost();h.c.V.CE_timePassMultiplier=true;h.c.V.CE_timeMultiplier=2;
  const stale=h.macro.handler;
  h.c.setup.CE_features.disable('time');assert.equal(h.macro.handler,h.original);
  stale.call({args:[3]});assert.equal(h.calls.at(-1).value,3);
  h.emit(':passagestart');h.emit(':passagedisplay');assert.equal(h.macro.handler,h.original);
  h.c.setup.CE_features.enable('time');
  h.c.State.variables=enabledState({CE_timePassMultiplier:true,CE_timeMultiplier:3});
  h.macro.handler.call({args:[3]});assert.equal(h.calls.at(-1).value,9);
  h.c.CE_MacroHook.hookMacro('pass',{owner:'custom',around(native){this.args[0]=7;return native.call(this);}});
  h.c.setup.CE_features.disable('time');
  h.macro.handler.call({args:[3]});assert.equal(h.calls.at(-1).value,7);
});

test('Time propagates native failure without leaving a global lock or changing unrelated arguments',()=>{
  const h=timeHost();h.c.setup.CE_macroLock=false;
  h.c.V.CE_timePassMultiplier=false;
  h.macro.handler.call({args:['invalid','native-extra']});assert.equal(h.calls.at(-1).value,'invalid');
  h.macro.handler=function(){throw Error('native-time-error');};
  h.c.CE_MacroHook.installAll();
  assert.throws(()=>h.macro.handler.call({args:[1]}),/native-time-error/);
  assert.equal(h.c.setup.CE_macroLock,false);
});
