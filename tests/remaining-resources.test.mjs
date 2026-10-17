import test from 'node:test';
import assert from 'node:assert/strict';
import { host, enabledState } from './hooks-host.mjs';

function runtime() {
  const h = host(), { c } = h, timers = new Map(), loads = new Set(); let serial = 0;
  c.setTimeout = fn => { const id = ++serial; timers.set(id, fn); return id; };
  c.clearTimeout = id => timers.delete(id);
  c.Save = { onLoad: { add: fn => loads.add(fn), delete: fn => loads.delete(fn) } };
  return { ...h, timers, loads, flush() { const batch = [...timers.values()]; timers.clear(); batch.forEach(fn => fn()); } };
}
function style(initial = '') {
  let display = initial, priority = '';
  return { get display() { return display; }, set display(value) { display = value; }, getPropertyValue() { return display; }, getPropertyPriority() { return priority; }, setProperty(_, value, p = '') { display = value; priority = p; }, removeProperty() { display = ''; priority = ''; } };
}

test('an inactive hide preference never reveals a sidebar element hidden by another owner', () => {
  const h = runtime(), element = { style: style('none') };
  h.c.document.getElementById = id => id === 'ui-bar-toggle' ? element : null;
  const jquery = h.c.$; h.c.$ = target => target === h.c.document ? jquery(target) : { toggle(show) { element.style.display = show ? 'block' : 'none'; } };
  h.load('scripts/CE_hideUiBarToggle.js'); h.emit(':passagedisplay'); h.flush();
  assert.equal(element.style.display, 'none');
});

test('sidebar hide releases its own display property and fences retained callbacks on disable', () => {
  const h = runtime(), element = { style: style('inline-flex') };
  h.c.document.getElementById = id => id === 'ui-bar-toggle' ? element : null;
  h.c.V.CE_hideUiBarToggleEnable = true; h.load('scripts/CE_hideUiBarToggle.js');
  h.emit(':passagedisplay'); h.flush(); assert.equal(element.style.display, 'none');
  h.emit(':passagedisplay'); const held = [...h.timers.values()];
  h.c.setup.CE_features.disable('sidebar-visibility'); held.forEach(fn => fn());
  assert.equal(element.style.display, 'inline-flex'); assert.equal(h.loads.size, 0);
});

function appearance() {
  const h = runtime(), { c } = h; let redraws = 0;
  const foreign = { name: 'cePbHairColor', thirdParty: true };
  c.Renderer = { RenderingPipeline: [foreign], lastAnimation: { invalidateCaches() {}, redraw() { redraws++; }, stop() {} }, animateLayersAgain() { redraws++; } };
  c.Wikifier = { wikifyEval() { redraws++; } };
  h.load('scripts/CE_appearanceRendering.js');
  return { ...h, foreign, redraws: () => redraws };
}
test('an appearance refresh queued by the old State cannot redraw a newly loaded State', () => {
  const h = appearance(); h.load('scripts/CE_customerEyesColor.js');
  h.c.refreshEyesSidebar(); h.c.State.variables = enabledState(); h.flush();
  assert.equal(h.redraws(), 0);
});

test('pubic hair registration preserves a foreign step with the same name and follows a native pipeline replacement', () => {
  const h = appearance(); h.load('scripts/CE_customerHairColor.js');
  assert.ok(h.c.Renderer.RenderingPipeline.includes(h.foreign));
  const native = { name: 'native' }; h.c.Renderer.RenderingPipeline = [native]; h.emit(':passagestart');
  const own = h.c.Renderer.RenderingPipeline.find(s => s !== native && s !== h.foreign);
  assert.ok(own);
  h.c.setup.CE_features.disable('pubic-hair-rendering');
  assert.deepEqual(h.c.Renderer.RenderingPipeline, [native]);
  h.c.V.CE_pbhairBlendMode = 'multiply'; const image = {};
  assert.equal(own.condition({ filters: ['pbhair'] }), false); assert.equal(own.render(image, {}), image);
});

test('retained sidebar timer cannot lose the newer handle or overwrite a foreign display priority', () => {
  const h = runtime(), element = { style: style('inline-flex') };
  h.c.document.getElementById = () => element;
  h.c.V.CE_hideUiBarToggleEnable = true; h.load('scripts/CE_hideUiBarToggle.js');
  h.emit(':passagedisplay'); const held = [...h.timers.values()][0];
  h.emit(':passagedisplay'); held(); h.c.setup.CE_features.disable('sidebar-visibility');
  assert.equal(h.timers.size, 0);
  h.c.setup.CE_features.enable('sidebar-visibility'); h.c.setup.CE_sidebarVisibility.refresh();
  element.style.setProperty('display', 'grid', 'important');
  h.c.setup.CE_features.disable('sidebar-visibility'); assert.equal(element.style.display, 'grid');
  assert.equal(element.style.getPropertyPriority('display'), 'important');
});

test('passage end keeps the original delayed hide for sidebar nodes inserted after display', () => {
  const h = runtime(); let late;
  h.c.document.getElementById = id => id === 'characterTemperature' ? late : null;
  h.c.V.CE_hideUiBarToggleEnable = true; h.load('scripts/CE_hideUiBarToggle.js');
  h.emit(':passagedisplay'); h.emit(':passageend'); assert.equal(h.timers.size, 1);
  late = { style: style('inline') }; h.flush(); assert.equal(late.style.display, 'none');
  h.c.setup.CE_features.disable('sidebar-visibility'); assert.equal(late.style.display, 'inline');
});

function frames(h) {
  const pending = new Map(); let serial = 0;
  h.c.requestAnimationFrame = fn => { const id = ++serial; pending.set(id, () => { pending.delete(id); fn(); }); return id; };
  h.c.cancelAnimationFrame = id => pending.delete(id);
  return pending;
}
test('menu frames are scoped to native close, State, disable and render generation', () => {
  const h = runtime(), pending = frames(h); h.load('scripts/CE_sideBarIcon.js');
  const manager = h.c.CE_TabManager, node = { isConnected: true }; let calls = 0;
  manager.frame(() => calls++, node); const valid = [...pending.values()][0]; valid(); assert.equal(calls, 1);
  manager.frame(() => calls++, node); const stale = [...pending.values()];
  h.emit(':passagestart'); stale.forEach(fn => fn()); assert.equal(calls, 1); assert.equal(pending.size, 0);
  manager.frame(() => calls++, node); h.c.State.variables = enabledState(); [...pending.values()].forEach(fn => fn()); assert.equal(calls, 1);
  manager.frame(() => calls++, node); const disabled = [...pending.values()];
  h.c.setup.CE_features.disable('ce-menu'); h.c.setup.CE_features.enable('ce-menu'); disabled.forEach(fn => fn());
  assert.equal(calls, 1); h.c.setup.CE_features.disable('ce-menu'); assert.equal(h.c.CEiconClicked(), false);
});

test('the actual two-level menu render retains its manager receiver when queuing labels', () => {
  const h = runtime(), pending = frames(h); h.load('scripts/CE_sideBarIcon.js');
  h.c.localStorage = { getItem: () => null, setItem() {} };
  const element = () => ({ isConnected: true, classList: { add() {}, contains() { return false; } }, dataset: {}, append() {}, appendChild() {}, querySelector: () => null });
  h.c.document.createElement = element;
  const manager = h.c.CE_TabManager;
  manager.applyOrder = () => {}; manager.ensureCategoryState = () => {};
  manager.getOrderedCategories = () => [{ id: 'one' }]; manager.getTabCategory = () => 'one'; manager.getCategoryTitle = () => 'One';
  manager.tabs = [{ id: 'example', title: 'Example' }];
  manager.render(element()); assert.equal(pending.size, 1);
  [...pending.values()].forEach(fn => fn());
});

function sortFixture() {
  const h = runtime(); frames(h); h.load('scripts/CE_sideBarIcon.js');
  h.c.localStorage = { getItem: () => null, setItem() {} };
  class Element {
    constructor() { this.children = []; this.style = {}; }
    get childElementCount() { return this.children.length; }
    get firstElementChild() { return this.children[0]; }
    appendChild(node) { node.remove(); node.parentNode = this; this.children.push(node); }
    append(...nodes) { nodes.forEach(node => this.appendChild(node)); }
    remove() { if (this.parentNode) this.parentNode.children = this.parentNode.children.filter(child => child !== this); this.parentNode = null; }
    replaceChildren() { for (const child of [...this.children]) child.remove(); }
  }
  h.c.document.createElement = () => new Element();
  const body = new Element(), callbacks = []; let open = false, closes = 0, renders = 0;
  h.c.Dialog = {
    setup() { body.replaceChildren(); }, wiki() {}, body: () => body, isOpen: () => open,
    open(options, callback) { open = true; callbacks.push(callback); },
    close() { closes++; open = false; body.replaceChildren(); callbacks.at(-1)?.(); },
  };
  const manager = h.c.CE_TabManager;
  manager.ensureCategoryState = () => {}; manager.getCategoryOrder = () => []; manager.getAllCategoriesRaw = () => [];
  manager.render = () => renders++; manager.restore = () => renders++;
  return { ...h, manager, body, callbacks, Element, open: () => open, closes: () => closes, renders: () => renders };
}

test('sort cleanup closes its native Dialog after invalidating the view and callback', () => {
  const h = sortFixture(); h.manager.openSortUI(); const wrap = h.manager._sortWrap;
  h.manager._container = { isConnected: true };
  h.c.setup.CE_features.disable('ce-menu');
  assert.equal(h.open(), false); assert.equal(h.closes(), 1); assert.equal(wrap.parentNode, null);
  assert.equal(h.renders(), 0); assert.equal(h.manager._container, null);
});

test('sort cleanup preserves a Dialog taken over or shared by a third party', () => {
  for (const replace of [true, false]) {
    const h = sortFixture(); h.manager.openSortUI(); const wrap = h.manager._sortWrap;
    if (replace) h.c.Dialog.setup();
    const foreign = new h.Element(); h.body.appendChild(foreign);
    h.c.setup.CE_features.disable('ce-menu');
    assert.equal(h.open(), true); assert.equal(h.closes(), 0);
    assert.equal(foreign.parentNode, h.body); assert.equal(wrap.parentNode, null);
  }
});

test('sort cleanup leaves late old close callbacks unable to render or clear a new session', () => {
  const h = sortFixture(); h.manager.openSortUI(); const stale = h.callbacks[0];
  h.manager.releaseView(); assert.equal(h.open(), false);
  h.manager.openSortUI(); const current = h.manager._sortWrap;
  h.manager._container = { isConnected: true }; stale();
  assert.equal(h.manager._sortWrap, current); assert.equal(current.parentNode, h.body);
  assert.equal(h.open(), true); assert.equal(h.renders(), 0);
});

test('normal sort close registers the callback in the native second argument', () => {
  const h = sortFixture(); h.manager.openSortUI(); h.manager._container = { isConnected: true };
  h.c.Dialog.close(); assert.equal(h.manager._sortWrap, null); assert.equal(h.renders(), 2);
});

test('map queues, nodes, frames and retained observer callbacks are released before re-enable', () => {
  const h = runtime(), pending = frames(h); h.load('scripts/CE_mapView.js');
  let renders = 0, removed = 0, disconnected = 0, writes = 0;
  const view = h.c.setup.CE_mapView('fixture-map', () => renders++, () => disconnected++);
  const heldTimer = [...h.timers.values()][0];
  h.emit(':passagestart'); heldTimer(); assert.equal(renders, 0);
  h.emit(':passagedisplay'); h.flush(); assert.equal(renders, 1);
  const root = { isConnected: true, remove() { removed++; } }; view.own(root);
  const observer = view.guard(() => writes++, root);
  view.frame(() => writes++); const heldFrames = [...pending.values()];
  h.c.setup.CE_features.disable('fixture-map'); h.c.setup.CE_features.enable('fixture-map');
  observer(); heldFrames.forEach(fn => fn()); assert.equal(writes, 0); assert.equal(removed, 1);
  assert.equal(pending.size, 0); assert.ok(disconnected > 0);
});

test('all five original map renderers register and preserve a foreign node with the same ID', () => {
  const h = runtime(); frames(h); const foreign = { remove() { throw Error('foreign removal'); } };
  h.c.document.getElementById = () => foreign;
  h.c.document.createElement = () => ({}); h.c.document.head = { appendChild() {} };
  h.load('scripts/CE_mapView.js');
  for (const file of ['CE_forestMapGui.js', 'CE_farmRoadMapGui.js', 'CE_sewersMapGui.js']) h.load(`scripts/${file}`);
  assert.equal(h.loads.size, 5); h.flush();
  for (const id of ['forest-map-gui', 'farm-road-map-gui', 'moor-map-gui', 'sewers-map-gui', 'beach-cave-map-gui']) {
    assert.equal(h.c.setup.CE_features.isEnabled(id), true); h.c.setup.CE_features.disable(id);
  }
  assert.equal(h.loads.size, 0);
});

test('manual inventory schema selection uses current native State and ignores an empty framework food table', () => {
  const h = runtime(); h.load('scripts/CE_inventory_helper.js');
  h.c.setup.foodstuff = {}; h.c.setup.plants = { apple: { type: 'fruit' } };
  const compat = h.c.setup.CE_foodCompat; assert.equal(compat.storeName(), 'plants');
  const original = compat.store(); original.apple = 2;
  h.c.State.variables = enabledState({ plants: { apple: 7 } });
  assert.equal(compat.store().apple, 7); assert.equal(original.apple, 2);
  h.c.setup.foodstuff = { rice: { category: 'grain' } }; assert.equal(compat.storeName(), 'foodstuff');
});

test('manual Avery navigation delegates once but a queued old scene cannot navigate a loaded State', () => {
  const h = runtime(); let plays = 0;
  h.c.Story = { has: () => true }; h.c.Engine = { play: () => plays++ }; h.c.Wikifier = { wikifyEval() {} };
  h.c.V.avery_mansion = {}; h.load('scripts/CE_manorHelper.js');
  assert.equal(h.c.setup.CE_ManorHelper.playScene('drink').ok, true); h.flush(); assert.equal(plays, 1);
  h.c.setup.CE_ManorHelper.playScene('drink'); h.c.State.variables = enabledState({ avery_mansion: {} });
  h.flush(); assert.equal(plays, 1);
  h.c.setup.CE_ManorHelper.playScene('drink'); h.c.State.passage = 'Other'; h.flush(); assert.equal(plays, 1);
});
