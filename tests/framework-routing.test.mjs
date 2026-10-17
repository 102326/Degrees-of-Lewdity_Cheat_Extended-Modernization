import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const source = name => readFileSync(name, 'utf8');
function context(extra = {}) {
  const warnings = [];
  const events = new Map();
  const c = vm.createContext({
    V: {}, setup: {}, document: {}, Macro: {add() {}},
    console: {log() {},info() {},warn: (...a) => warnings.push(a),error: (...a) => warnings.push(a)},
    $: () => ({one(name, callback) { events.set(name, callback); }}),
    ...extra,
  });
  c.window = c;
  return {c,warnings,events,load: file => vm.runInContext(source(file), c, {filename: file})};
}

test('runtime payload contains no retired framework calls or misleading detector', () => {
  const boot = JSON.parse(source('boot.json'));
  for (const name of [...boot.scriptFileList, ...boot.scriptFileList_inject_early]) {
    assert.doesNotMatch(source(name), /Simple Frameworks|simpleFrameworks|TimeHandle|new TimeEvent/);
  }
  assert.ok(!boot.scriptFileList_inject_early.some(name => name.endsWith('framework_detector.js')));
  assert.doesNotMatch(source('addon-replace/StoryCaption.txt'), /CE_SFflag|CE_sideBarIcon/);
});

test('native tattoo definitions need no framework and remain idempotent', () => {
  const {c,load} = context({setup:{bodywriting:{original:{index:0}},bodywriting_namebyindex:{0:'original'}}});
  load('scripts/CE_tattoo.js');
  assert.equal(Object.keys(c.setup.bodywriting).length,14);
  c.registerCETattoos();
  assert.equal(Object.keys(c.setup.bodywriting).length,14);
  for(let i=0;i<13;i++) {
    const t=c.setup.bodywriting['tattoo_CE'+i];
    assert.equal(t.writing,`$CE_tattoo[${i}]`);
    assert.equal(c.setup.bodywriting_namebyindex[t.index], 'tattoo_CE'+i);
  }
});

test('tattoos defer to native passage initialization instead of a polling timer', () => {
  const {c,load,events} = context();load('scripts/CE_tattoo.js');
  assert.equal(events.size,1);
  c.setup.bodywriting={original:{index:0}};
  events.get(':passageinit')();
  assert.equal(Object.keys(c.setup.bodywriting).length,14);
});

test('UI registers the six existing Maple injection points exactly once without optional Mod probes', async () => {
  let hook;const calls=[];
  const {load} = context({
    modSC2DataManager:{getModLoadController:()=>({addLifeTimeCircleHook(name,value){hook=value;}})},
    modUtils:{getMod(){throw Error('No name probes');}},
    maplebirch:{modList:{pushUnique() {}},tool:{addTo(zone,widget){calls.push([zone,widget]);}}},
  });
  load('scriptEarly/CERegist.js');await hook.ModLoaderLoadEnd();
  assert.deepEqual(calls,[['Cheats','cheat_extended'],['MenuBig','CE_originalCheatButton'],['CaptionAfterDescription','CEstatebox'],['Options','CE_options'],['HintMobile','CE_sideBarIcon'],['Footer','CE_CheatExtendedVersion']]);
});

test('time registration preserves the real provider, event name, options and callback', () => {
  const calls=[];
  const dynamic={regTimeEvent(type,name,options){assert.equal(this,dynamic);calls.push({type,name,options});return name;},
    delTimeEvent(type,name){assert.equal(this,dynamic);return type+':'+name;}};
  const {c,load} = context({maplebirch:{dynamic}});load('scripts/core/CE_features.js');load('scripts/CE_Time_Event.js');
  const callback=()=>42;
  assert.equal(c.registerCE_genericTimeEvent('onSec','test',callback),'test');
  assert.deepEqual(calls.map(e=>[e.type,e.name]),[['onAfter','CE_自動調溫'],['onDay','CE_額外狀態恢復'],['onSec','test']]);
  assert.equal(calls[2].options.action,callback);
  assert.equal(calls[2].options.priority,0);assert.equal(calls[2].options.once,false);
  assert.equal(c.unregisterCE_genericTimeEvent('onSec','test'),'onSec:test');
});

test('time travel forwards signed payload and receiver; missing provider does not navigate', () => {
  const calls=[];const pages=[];
  const dynamic={timeTravel(payload){assert.equal(this,dynamic);calls.push(payload);}};
  const {c,load,warnings} = context({V:{passage:'Bedroom'},maplebirch:{dynamic},Engine:{play:p=>pages.push(p)}});
  load('scripts/CE_TimeTravelPlus.js');
  vm.runInContext('TimeTravelAdapter.relative({addDays:-1,addHours:2,addSeconds:3})',c);
  assert.deepEqual(JSON.parse(JSON.stringify(calls)),[{addDays:-1,addHours:2,addSeconds:3}]);
  assert.deepEqual(pages,['Bedroom']);
  dynamic.timeTravel=()=>false;
  assert.equal(vm.runInContext('TimeTravelAdapter.relative({addSeconds:1})',c),false);
  assert.equal(pages.length,1);
  delete c.maplebirch;
  assert.equal(vm.runInContext('TimeTravelAdapter.absolute({year:2026})',c),false);
  assert.equal(pages.length,1);assert.equal(warnings.length,1);
});

test('the rendered hour shortcut navigates once on success and never on provider failure', () => {
  const elements = [], macros = new Map(), pages = [];
  const createElement = tag => {
    const node = { tag, children: [], style: {}, appendChild(n) { this.children.push(n); }, getBoundingClientRect: () => ({width: 20}) };
    elements.push(node); return node;
  };
  const dynamic = { timeTravel: () => true };
  const { c, load } = context({
    V: { passage: 'Bedroom' }, Time: {year:2026,month:10,monthDay:17,hour:12,minute:0,second:0},
    document: { createElement }, Macro: {add: (name, value) => macros.set(name, value)},
    requestAnimationFrame: fn => fn(), maplebirch: {dynamic}, Engine: {play: p => pages.push(p)},
  });
  load('scripts/CE_TimeTravelPlus.js');
  macros.get('CE_TimeTravelPlus').handler.call({output:createElement('div')});
  const button = elements.find(n => n.tag === 'button' && n.textContent === '13點');
  assert.equal(button.onclick(), true); assert.deepEqual(pages, ['Bedroom']);
  dynamic.timeTravel = () => false;
  assert.equal(button.onclick(), false); assert.equal(pages.length, 1);
  dynamic.timeTravel = () => { throw Error('provider failed'); };
  assert.throws(() => button.onclick(), /provider failed/); assert.equal(pages.length, 1);
  delete c.maplebirch;
  assert.equal(button.onclick(), false); assert.equal(pages.length, 1);
});
