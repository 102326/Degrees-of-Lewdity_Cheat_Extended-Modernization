import test from 'node:test';
import assert from 'node:assert/strict';
import { host, enabledState } from './hooks-host.mjs';

function fixture() {
  const h = host(); const { c } = h;
  const onLoad = new Set();
  c.Save = { onLoad: { add: fn => onLoad.add(fn), delete: fn => onLoad.delete(fn) } };
  c.Renderer = { RenderingPipeline: [] };
  c.clone = structuredClone;
  c.setup.colours = { eyes: [{ variable: 'brown' }], hair: [{ variable: 'brown' }], skin_options: { light: { gradient: ['#ffffff'] } } };
  c.buildColourMap = kind => { c.setup.colours[kind + '_map'] = Object.fromEntries(c.setup.colours[kind].map(e => [e.variable, e])); };
  h.load('scripts/CE_customColours.js');
  for (const name of ['Skin', 'Eyes', 'Hair']) h.load(`scripts/CE_customer${name}Color.js`);
  return { ...h, onLoad, loadState(state) {
    for (const fn of onLoad) fn();
    c.State.variables = enabledState(state);
    h.emit(':passageinit'); h.emit(':passagestart'); h.emit(':passagedisplay');
  } };
}
const custom = () => ({
  customEye: [{ variable: 'ce_eye_test', canvasfilter: { blend: '#123456' } }],
  customHair: [{ variable: 'ce_hair_test', canvasfilter: { blend: '#abcdef' } }],
  customSkin: [{ name: 'ce_skin_test', colors: ['#ffffff', '#000000'] }],
});

for (const [kind, key] of [['eyes', 'ce_eye_test'], ['hair', 'ce_hair_test'], ['skin_options', 'ce_skin_test']]) {
  test(`${kind}: loading a save without custom colours removes only the previous CE projection`, () => {
    const h = fixture(); h.loadState(custom());
    const palette = h.c.setup.colours;
    assert.ok(kind === 'skin_options' ? palette[kind][key] : palette[kind].some(e => e.variable === key));
    h.loadState({});
    assert.equal(kind === 'skin_options' ? !!palette[kind][key] : palette[kind].some(e => e.variable === key), false);
    if (kind !== 'skin_options') assert.equal(palette[kind + '_map'][key], undefined);
    assert.ok(palette.eyes.some(e => e.variable === 'brown'));
    assert.ok(palette.skin_options.light);
  });
}
test('eye load is independent of whether the save contains custom skin', () => {
  const h = fixture(); h.loadState({ customEye: custom().customEye });
  assert.ok(h.c.setup.colours.eyes_map?.ce_eye_test);
});

test('loading a save restores collided native definitions by identity, and projects before display', () => {
  const h = fixture(), colours = h.c.setup.colours;
  const eye = colours.eyes[0], hair = colours.hair[0], skin = colours.skin_options.light;
  h.loadState({ customEye: [{ variable: 'brown', name: 'custom' }], customHair: [{ variable: 'brown' }], customSkin: [{ name: 'light', colors: ['#112233'] }] });
  assert.notEqual(colours.eyes[0], eye);
  h.loadState({});
  assert.equal(colours.eyes[0], eye); assert.equal(colours.hair[0], hair); assert.equal(colours.skin_options.light, skin);
});

test('foreign replacement, nested mutation and descriptor edits survive CE cleanup', () => {
  const h = fixture(); h.loadState(custom()); const colours = h.c.setup.colours;
  const foreign = { variable: 'ce_eye_test', thirdParty: true };
  colours.eyes[colours.eyes.findIndex(e => e.variable === foreign.variable)] = foreign;
  const hair = colours.hair.find(e => e.variable === 'ce_hair_test'); hair.canvasfilter.blend = '#000001';
  const skin = colours.skin_options.ce_skin_test;
  Object.defineProperty(colours.skin_options, 'ce_skin_test', { enumerable: false });
  h.loadState({});
  assert.ok(colours.eyes.includes(foreign)); assert.ok(colours.hair.includes(hair));
  assert.equal(colours.skin_options.ce_skin_test, skin);
  assert.equal(Object.getOwnPropertyDescriptor(colours.skin_options, 'ce_skin_test').enumerable, false);
});

test('projection does not alias saved nested data; removal and rename share owned cleanup', () => {
  const h = fixture(); h.loadState(custom()); const colours = h.c.setup.colours;
  const eye = colours.eyes.find(e => e.variable === 'ce_eye_test');
  h.c.V.customEye[0].canvasfilter.blend = '#111111';
  assert.equal(eye.canvasfilter.blend, '#123456');
  h.c.pushCustomEyesToSetup(); assert.equal(colours.eyes_map.ce_eye_test.canvasfilter.blend, '#111111');
  h.c.V.customSkin[0].name = 'renamed'; h.c.pushCustomSkinsToSetup();
  assert.equal(colours.skin_options.ce_skin_test, undefined); assert.ok(colours.skin_options.renamed);
  h.c.V.customHair = []; h.c.pushCustomHairToSetup(); assert.equal(colours.hair_map.ce_hair_test, undefined);
});

test('disable detaches automatic resources without undoing active appearance; enable reprojects new save', () => {
  const h = fixture(); h.loadState(custom());
  h.c.V.leftEyeColour = 'ce_eye_test';
  h.c.setup.CE_features.disable('custom-colours'); assert.equal(h.onLoad.size, 0);
  assert.ok(h.c.setup.colours.eyes_map.ce_eye_test); assert.equal(h.c.V.leftEyeColour, 'ce_eye_test');
  h.loadState({}); assert.ok(h.c.setup.colours.eyes_map.ce_eye_test);
  h.c.setup.CE_features.enable('custom-colours'); h.emit(':passagestart');
  assert.equal(h.onLoad.size, 1); assert.equal(h.c.setup.colours.eyes_map.ce_eye_test, undefined);
});

test('failed observer removal leaves no active callback and still releases the document listener', () => {
  const h = fixture(); const callback = [...h.onLoad][0];
  h.c.Save.onLoad.delete = () => { throw Error('provider refused'); };
  assert.throws(() => h.c.setup.CE_features.disable('custom-colours'), /provider refused/);
  h.c.State.variables = enabledState(custom()); callback(); h.emit(':passagestart');
  assert.equal(h.c.setup.colours.eyes_map?.ce_eye_test, undefined);
});

test('native colour-map default merging is part of the owned projection', () => {
  const h = fixture(), build = h.c.buildColourMap;
  // Real buildColourMap calls Renderer.mergeLayerData on each entry's canvasfilter.
  h.c.buildColourMap = kind => {
    for (const item of h.c.setup.colours[kind]) if (item.canvasfilter) item.canvasfilter.brightness ??= 0;
    return build(kind);
  };
  h.loadState(custom()); assert.equal(h.c.setup.colours.eyes_map.ce_eye_test.canvasfilter.brightness, 0);
  h.loadState({});
  assert.equal(h.c.setup.colours.eyes_map.ce_eye_test, undefined);
  assert.equal(h.c.setup.colours.hair_map.ce_hair_test, undefined);
});

test('cleanup does not invoke a foreign nested getter', () => {
  const h = fixture(); h.loadState(custom()); let calls = 0;
  const entry = h.c.setup.colours.eyes_map.ce_eye_test;
  Object.defineProperty(entry.canvasfilter, 'blend', { get() { calls++; return '#ffffff'; }, configurable: true });
  h.loadState({});
  assert.equal(calls, 0); assert.equal(h.c.setup.colours.eyes_map.ce_eye_test, entry);
});

test('replacing a palette cleans the detached CE entries and preserves the new native palette', () => {
  const h = fixture(); h.loadState(custom()); const old = h.c.setup.colours.eyes;
  const replacement = [{ variable: 'new-native-eye' }]; h.c.setup.colours.eyes = replacement;
  h.loadState({});
  assert.equal(h.c.setup.colours.eyes, replacement);
  assert.equal(old.some(e => e.variable === 'ce_eye_test'), false);
  assert.equal(h.c.setup.colours.eyes_map['new-native-eye'], replacement[0]);
});

test('a shallow-copied palette keeps copied CE objects as third-party-owned entries', () => {
  const h = fixture(); h.loadState(custom()); const old = h.c.setup.colours.eyes;
  const copied = old.slice(), carried = h.c.setup.colours.eyes_map.ce_eye_test;
  h.c.setup.colours.eyes = copied;
  h.loadState({});
  assert.equal(old.includes(carried), false);
  assert.equal(h.c.setup.colours.eyes, copied);
  assert.equal(copied.includes(carried), true);
  assert.equal(h.c.setup.colours.eyes_map.ce_eye_test, carried);
});

test('an explicit edit after a foreign replacement restores that latest foreign baseline on load', () => {
  const h = fixture(); h.loadState(custom());
  const colours = h.c.setup.colours, foreign = { variable: 'ce_eye_test', name: 'third party baseline' };
  colours.eyes[colours.eyes.findIndex(e => e.variable === foreign.variable)] = foreign;
  h.c.V.customEye[0].name = 'explicit new edit'; h.c.pushCustomEyesToSetup();
  assert.equal(colours.eyes_map.ce_eye_test.name, 'explicit new edit');
  h.loadState({}); assert.equal(colours.eyes_map.ce_eye_test, foreign);
});

test('editing an owned colour targets its object after a same-name foreign entry is inserted before it', () => {
  const h = fixture(), colours = h.c.setup.colours;
  const hairBaseline = { variable: 'ce_hair_test', name: 'original hair definition' };
  colours.hair.push(hairBaseline);
  h.loadState(custom());
  for (const [kind, field, push] of [['eyes', 'customEye', 'pushCustomEyesToSetup'], ['hair', 'customHair', 'pushCustomHairToSetup']]) {
    const key = h.c.V[field][0].variable, previousCE = colours[kind + '_map'][key];
    const foreign = { variable: key, name: 'foreign entry before CE' };
    colours[kind].unshift(foreign);
    const foreignDescriptor = Object.getOwnPropertyDescriptor(colours[kind], '0');
    h.c.V[field][0].canvasfilter.blend = '#987654';
    h.c[push]();
    assert.deepEqual(Object.getOwnPropertyDescriptor(colours[kind], '0'), foreignDescriptor);
    assert.equal(colours[kind].includes(previousCE), false, `${kind}: old CE object stays tracked until replaced`);
    assert.equal(colours[kind + '_map'][key].canvasfilter.blend, '#987654');
  }
  const foreignEye = colours.eyes[0], foreignHair = colours.hair[0];
  h.loadState({});
  assert.deepEqual([...colours.eyes], [foreignEye, colours.eyes.find(e => e.variable === 'brown')]);
  assert.deepEqual([...colours.hair], [foreignHair, colours.hair.find(e => e.variable === 'brown'), hairBaseline]);
});

test('manual eye creation reserves saved keys even when the automatic load bridge is disabled', () => {
  const h = fixture(), { c } = h, nodes = [];
  c.setup.CE_features.disable('custom-colours');
  h.loadState({ customEye: [{ ...custom().customEye[0], variable: 'eye1', name: 'existing' }] });
  c.document.createElement = tag => {
    const node = { tag, style: {}, children: [], appendChild(child) { this.children.push(child); }, append(...children) { this.children.push(...children); } };
    nodes.push(node); return node;
  };
  const jquery = c.$;
  c.$ = target => target === c.document ? jquery(target) : { spectrum() {} };
  h.macroRegistry.get('eyeCustomManager').handler.call({ output: c.document.createElement('div') });
  nodes.find(node => node.textContent === '＋ 新增眼色').onclick();
  assert.equal(c.V.customEye.length, 2);
  assert.equal(new Set(c.V.customEye.map(e => e.variable)).size, 2);
});
