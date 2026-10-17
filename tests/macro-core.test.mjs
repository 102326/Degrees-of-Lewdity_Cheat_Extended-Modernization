import test from 'node:test';
import assert from 'node:assert/strict';
import { host } from './hooks-host.mjs';

test('Macro Core defers missing definitions without throwing and binds when the native Macro appears',()=>{
  const {c,macroRegistry}=host({macros:true});
  c.CE_MacroHook.hookMacro('late',{owner:'module',around(native){return native.call(this)+1;}});
  macroRegistry.set('late',{handler(){return 7;}});
  c.CE_MacroHook.installAll();assert.equal(macroRegistry.get('late').handler.call({args:[]}),8);
  c.CE_MacroHook.unregisterOwner('module');assert.equal(macroRegistry.get('late').handler.call({args:[]}),7);
  c.CE_MacroHook.hookMacro('never-defined',{owner:'absent'});
  c.CE_MacroHook.unregisterOwner('absent');
});

test('Macro Core composes owners without duplicate calls and releases the exact handler', () => {
  const h=host({macros:true});const {c,macroRegistry}=h;
  const calls=[];
  const original=function(arg){calls.push([this.marker,this.args[0],arg]);return 'result';};
  const macro={handler:original};macroRegistry.set('owned',macro);
  c.V.testCheat=true;
  const options={owner:'a',cheatVar:'testCheat',modifyFunc:args=>[args[0]*2]};
  c.CE_MacroHook.hookMacro('owned',options);
  options.modifyFunc=()=>[99];
  assert.equal(macro.handler.call({marker:1,args:[3]},'native-arg'),'result');
  c.CE_MacroHook.hookMacro('owned',{owner:'b',cheatVar:'testCheat',modifyFunc:args=>[args[0]*3]});
  macro.handler.call({marker:2,args:[3]});
  c.CE_MacroHook.unregisterOwner('b');
  macro.handler.call({marker:3,args:[3]});
  const stale=macro.handler;
  c.CE_MacroHook.unregisterOwner('a');
  assert.equal(macro.handler,original);
  stale.call({marker:4,args:[3]});
  assert.deepEqual(calls,[[1,6,'native-arg'],[2,9,undefined],[3,6,undefined],[4,3,undefined]]);
});

test('Macro Core rebinds under a foreign wrapper once and does not remove foreign ownership', () => {
  const {c,macroRegistry}=host({macros:true});
  let native=0,foreign=0,modify=0;
  const macro={handler(){native++;return this.args[0];}};macroRegistry.set('wrapped',macro);
  c.V.testCheat=true;
  c.CE_MacroHook.hookMacro('wrapped',{owner:'ce',cheatVar:'testCheat',modifyFunc:args=>{modify++;return[args[0]*2];}});
  const stale=macro.handler;
  const thirdParty=function(){foreign++;return stale.call(this);};
  macro.handler=thirdParty;
  c.CE_MacroHook.installAll();c.CE_MacroHook.installAll();
  assert.equal(macro.handler.call({args:[3]}),6);
  assert.deepEqual([native,foreign,modify],[1,1,1]);
  c.CE_MacroHook.unregisterOwner('ce');
  assert.equal(macro.handler,thirdParty);
  assert.equal(macro.handler.call({args:[3]}),3);
  assert.deepEqual([native,foreign,modify],[2,2,1]);
});

test('Macro Core makes removed definitions and their saved aliases inert', () => {
  const {c,macroRegistry}=host({macros:true});c.V.testCheat=true;
  let count=0;
  const original={handler(){return this.args[0];}};macroRegistry.set('generation',original);
  c.CE_MacroHook.hookMacro('generation',{owner:'ce',cheatVar:'testCheat',modifyFunc:args=>{count++;return[args[0]*2];}});
  const stale=original.handler;
  const next={handler(){return this.args[0]+1;}};macroRegistry.set('generation',next);
  assert.equal(stale.call({args:[3]}),3);
  c.CE_MacroHook.installAll();
  assert.equal(next.handler.call({args:[3]}),7);
  c.CE_MacroHook.unhookMacro('generation');
  assert.equal(next.handler.call({args:[3]}),4);
  assert.equal(count,1);
});

test('Macro Core propagates modifier exceptions before changing the caller lock', () => {
  const {c,macroRegistry}=host({macros:true});c.V.testCheat=true;
  let called=0;macroRegistry.set('exception',{handler(){called++;}});
  c.setup.CE_macroLock='outer';
  c.CE_MacroHook.hookMacro('exception',{cheatVar:'testCheat',modifyFunc(){throw Error('modifier');}});
  assert.throws(()=>macroRegistry.get('exception').handler.call({args:[3]}),/modifier/);
  assert.equal(c.setup.CE_macroLock,'outer');assert.equal(called,0);
});

test('around consumers own their business and lock policy while Core owns wrapper lifetime', () => {
  const {c,macroRegistry}=host({macros:true});
  let calls=0;
  const original=function(arg){calls++;assert.equal(this.marker,7);return arg;};
  const macro={handler:original};macroRegistry.set('around',macro);
  c.setup.CE_macroLock='caller';
  c.CE_MacroHook.hookMacro('around',{owner:'module',around(native,arg){
    assert.equal(c.setup.CE_macroLock,'caller');return native.call(this,arg)+1;
  }});
  assert.equal(macro.handler.call({marker:7},4),5);
  assert.equal(calls,1);assert.equal(c.setup.CE_macroLock,'caller');
  const stale=macro.handler;c.CE_MacroHook.unregisterOwner('module');
  assert.equal(macro.handler,original);assert.equal(stale.call({marker:7},4),4);
});

test('all real built-in status Macros can disable and re-enable without leaking any wrapper', () => {
  const h=host({macros:true});const {c,macroRegistry}=h;
  const names=['pain','masopain','trauma','combattrauma','straighttrauma','control','combatcontrol','stress',
    'breast_sensitivity','mouth_sensitivity','genital_sensitivity','bottom_sensitivity',
    'arousal','breastarousal','genitalarousal','tiredness',
    'oralskill','vaginalskill','penileskill','handskill','analskill','feetskill','bottomskill','thighskill',
    'chestskill','beauty','seductionskill','skulduggery'];
  const originals=names.map(()=>function(){return this.args[0];});
  names.forEach((name,i)=>macroRegistry.set(name,{handler:originals[i]}));
  h.emit(':passagedisplay');
  c.V.CE_painCheat=true;c.V.CE_painMultiplier=2;
  assert.equal(macroRegistry.get('pain').handler.call({args:[3]}),6);
  c.setup.CE_features.disable('macro-status');
  names.forEach((name,i)=>assert.equal(macroRegistry.get(name).handler,originals[i],name));
  h.emit(':passagedisplay');
  names.forEach((name,i)=>assert.equal(macroRegistry.get(name).handler,originals[i],name));
  c.setup.CE_features.enable('macro-status');
  assert.equal(macroRegistry.get('pain').handler.call({args:[3]}),6);
});
