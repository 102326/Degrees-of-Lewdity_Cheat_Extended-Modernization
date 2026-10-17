import test from 'node:test';
import assert from 'node:assert/strict';
import { host, enabledState } from './hooks-host.mjs';

const plain=value=>JSON.parse(JSON.stringify(value));
function clothingHost({custom=false}={}) {
  const h=host({custom}),{c}=h;
  const shirt={name:'shirt',type:['school']},other={name:'other',type:['casual']};
  c.console.info=()=>{};
  c.setup.clothes={upper:[shirt,other]};c.setup.shopDetails={school:{name:'school'}};
  c.V.worn={upper:{name:'shirt',type:['school']}};
  h.load('scripts/CE_clothTraitEditor.js');h.emit(':passageinit');
  return {...h,shirt,other,editor:c.setup.CEClothTraitEditor};
}

test('trait reconciliation restores only CE edits, leaving unedited third-party definitions and worn instances alone',()=>{
  const h=clothingHost(),{c,shirt,other,editor}=h;
  other.type=['foreign'];editor.edit('upper','shirt',['CE']);
  assert.deepEqual(plain(c.V.worn.upper.type),['CE']);
  const saved={upper:{shirt:{name:'shirt',types:['saved']}}};
  c.State.variables=enabledState({CE_clothTraitOverrides:saved,worn:{upper:{name:'shirt',type:['native-save']}}});
  h.emit(':passageinit');
  assert.deepEqual(plain(shirt.type),['saved']);assert.deepEqual(other.type,['foreign']);
  assert.deepEqual(c.V.worn.upper.type,['native-save']);
  delete c.V.CE_clothTraitOverrides;editor.refresh();
  assert.deepEqual(plain(shirt.type),['school']);assert.deepEqual(other.type,['foreign']);
});

for(const change of ['replace','in-place'])test(`trait release preserves third-party ${change} changes to an edited definition`,()=>{
  const h=clothingHost(),{c,shirt,editor}=h;
  editor.edit('upper','shirt',['CE']);
  if(change==='replace')shirt.type=['foreign'];else shirt.type.push('foreign');
  const expected=shirt.type;
  c.State.variables=enabledState({});h.emit(':passageinit');
  assert.equal(shirt.type,expected);
  assert.deepEqual(plain(shirt.type),change==='replace'?['foreign']:['CE','foreign']);
});

test('trait cleanup preserves foreign property flags and never calls a replacement accessor',()=>{
  const h=clothingHost(),{c,shirt,other,editor}=h;
  editor.edit('upper','shirt',['CE']);editor.edit('upper','other',['CE-other']);
  Object.defineProperty(shirt,'type',{writable:false});
  let writes=0;const foreign=other.type;
  Object.defineProperty(other,'type',{get:()=>foreign,set:()=>writes++,configurable:true});
  c.setup.CE_features.disable('clothing-traits');
  assert.equal(Object.getOwnPropertyDescriptor(shirt,'type').writable,false);
  assert.deepEqual(plain(shirt.type),['CE']);assert.equal(other.type,foreign);assert.equal(writes,0);
});

test('late Mod slots and same-name replacement objects use their own baseline and retain the saved schema',()=>{
  const h=clothingHost(),{c,shirt,editor}=h;
  editor.edit('upper','shirt',['CE-old']);
  const replacement={name:'shirt',type:['new-base']};c.setup.clothes.upper[0]=replacement;
  const late={name:'mod-garment',type:['mod-base']};c.setup.clothes.over_head=[late];
  assert.deepEqual(plain(editor.edit('over_head','mod-garment',['mod-edited'])),['mod-edited']);
  editor.edit('upper','shirt',['new-edit']);
  assert.deepEqual(plain(editor.restore('upper','shirt')),['new-base']);
  assert.deepEqual(plain(editor.restore('over_head','mod-garment')),['mod-base']);
  assert.deepEqual(plain(c.V.CE_clothTraitOverrides),{});
  c.State.variables=enabledState({});h.emit(':passageinit');
  assert.deepEqual(plain(shirt.type),['school']);assert.deepEqual(plain(replacement.type),['new-base']);
});

test('trait module disable releases definitions, pauses old APIs and can bind a different saved record on re-enable',()=>{
  const h=clothingHost(),{c,shirt,editor}=h;
  editor.edit('upper','shirt',['CE']);
  c.setup.CE_features.disable('clothing-traits');
  assert.deepEqual(plain(shirt.type),['school']);
  assert.throws(()=>editor.edit('upper','shirt',['off']),/停用/);
  c.State.variables=enabledState({CE_clothTraitOverrides:{upper:{shirt:{name:'shirt',types:['next']}}}});
  h.emit(':passageinit');editor.refresh();assert.deepEqual(plain(shirt.type),['school']);
  c.setup.CE_features.enable('clothing-traits');assert.deepEqual(plain(shirt.type),['next']);
  editor.restoreAll();assert.deepEqual(plain(shirt.type),['school']);
  assert.deepEqual(plain(c.V.CE_clothTraitOverrides),{});
});

test('explicit settings reset clears trait records and owned definition edits without rolling back native inventory',()=>{
  const h=clothingHost({custom:true}),{c,shirt,other,editor}=h;
  h.load('scripts/clearCEVars.js');
  other.type=['foreign'];c.V.CE_otherModValue=42;
  editor.edit('upper','shirt',['CE']);const worn=c.V.worn;
  c.clearCEVars();
  assert.equal(Object.hasOwn(c.V,'CE_clothTraitOverrides'),false);
  assert.deepEqual(plain(shirt.type),['school']);assert.deepEqual(other.type,['foreign']);
  assert.equal(c.V.worn,worn);assert.deepEqual(plain(worn.upper.type),['CE']);
  assert.equal(c.V.CE_otherModValue,42);
});

test('worn trait presets retain native state and release their automatic page callback',()=>{
  const h=host(),{c}=h;c.setup.shopDetails={};
  Object.assign(c.V,{worn:{upper:{name:'shirt',type:['base']}},clothTypeAutoApply:true,clothTypeLastPreset:'saved',clothTypePresets:{saved:{upper:['preset']}}});
  h.load('scripts/CE_clothTypeManager.js');h.emit(':passagedisplay');
  assert.deepEqual(plain(c.V.worn.upper.type),['preset']);
  c.setup.CE_features.disable('worn-trait-presets');
  c.V.worn.upper.type=['native'];h.emit(':passagedisplay');c.setup.autoApplyClothTypePreset();
  assert.deepEqual(plain(c.V.worn.upper.type),['native']);
  c.setup.CE_features.enable('worn-trait-presets');h.emit(':passagedisplay');
  assert.deepEqual(plain(c.V.worn.upper.type),['preset']);
});

test('an unchanged configuration may cache past replacement definitions until explicit refresh',()=>{
  const h=clothingHost(),{c,editor}=h;
  editor.edit('upper','shirt',['CE']);const db=c.V.CE_clothTraitOverrides;
  const replacement={name:'shirt',type:['replacement']};c.setup.clothes.upper[0]=replacement;
  h.emit(':passageinit');
  assert.equal(c.V.CE_clothTraitOverrides,db);assert.deepEqual(replacement.type,['replacement']);
  editor.refresh();assert.deepEqual(plain(replacement.type),['CE']);
});

for(const release of ['refresh','disable'])test(`single restore applies A now; ${release} can return the definition to third-party B`,()=>{
  const h=clothingHost(),{c,shirt,editor}=h;
  shirt.type=['B'];editor.edit('upper','shirt',['C']);
  assert.deepEqual(plain(editor.restore('upper','shirt')),['school']);
  assert.deepEqual(plain(c.V.worn.upper.type),['school']);
  assert.deepEqual(plain(c.V.CE_clothTraitOverrides),{});
  if(release==='refresh')editor.refresh();else c.setup.CE_features.disable('clothing-traits');
  assert.deepEqual(plain(shirt.type),['B']);assert.deepEqual(plain(c.V.worn.upper.type),['school']);
});

test('bulk withdrawal differs from single restore by syncing affected worn items to B',()=>{
  const {c,shirt,editor}=clothingHost();
  shirt.type=['B'];editor.edit('upper','shirt',['C']);editor.restoreAll();
  assert.deepEqual(plain(shirt.type),['B']);assert.deepEqual(plain(c.V.worn.upper.type),['B']);
  assert.deepEqual(plain(c.V.CE_clothTraitOverrides),{});
});

test('an already opened manual panel can apply and restore while automatic presets are disabled',()=>{
  const h=host(),{c}=h,nodes=[];
  c.document.createElement=tag=>{
    const node={tag,style:{},children:[],appendChild(child){this.children.push(child);},append(...children){this.children.push(...children);}};
    nodes.push(node);return node;
  };
  c.Wikifier={wikifyEval(){}};c.setup.shopDetails={school:{name:'school'}};
  c.setup.clothes={upper:[{name:'shirt',type:['base']}]};c.V.worn={upper:{name:'shirt',type:['school']}};
  h.load('scripts/CE_clothTypeManager.js');
  const macro=h.macroRegistry.get('clothTypeManager');macro.handler.call({output:c.document.createElement('div')});
  const apply=nodes.find(n=>n.tag==='span'&&n.textContent==='套用');
  const restore=nodes.find(n=>n.tag==='span'&&n.textContent==='還原');
  c.setup.CE_features.disable('worn-trait-presets');c.V.worn.upper.type=['external'];
  apply.onclick();assert.deepEqual(plain(c.V.worn.upper.type),['school']);
  restore.onclick();assert.deepEqual(plain(c.V.worn.upper.type),['base']);
  const output=c.document.createElement('div');macro.handler.call({output});
  assert.match(output.children[0],/自動預設已停用/);
});
