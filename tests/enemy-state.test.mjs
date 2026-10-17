import test from 'node:test';
import assert from 'node:assert/strict';
import { host, enabledState } from './hooks-host.mjs';

function fixture(extra = {}) {
  const h = host(), { c } = h, frames = new Map(), timers = new Map(), loads = new Set();
  let sequence = 0;
  class Node {
    constructor(tag) { this.tagName = tag; this.children = []; this.style = {}; this.className = ''; this.classList = { add: (...names) => { this.className += ' ' + names.join(' '); } }; }
    get isConnected() { return this === body || !!this.parent?.isConnected; }
    get firstChild() { return this.children[0]; }
    appendChild(child) { child.parent = this; this.children.push(child); return child; }
    append(...children) { children.forEach(child => this.appendChild(child)); }
    insertBefore(child, before) { child.parent = this; const index = this.children.indexOf(before); this.children.splice(index < 0 ? this.children.length : index, 0, child); }
    remove() { if (this.parent) { this.parent.children.splice(this.parent.children.indexOf(this), 1); this.parent = null; } }
    querySelectorAll(selector) {
      if (selector === ':scope > div') return this.children.filter(n => n.tagName === 'div');
      return descendants(this).filter(n => selector.startsWith('#') ? n.id === selector.slice(1) : n.className.split(' ').includes(selector.slice(1)));
    }
    querySelector(selector) { return this.querySelectorAll(selector)[0] ?? null; }
  }
  function descendants(node) { return node.children.flatMap(child => [child, ...descendants(child)]); }
  const body = new Node('body'); let passage;
  function newScene() { passage?.remove(); passage = new Node('div'); passage.id = 'passage-content'; body.append(passage); for (let i = 0; i < 3; i++) passage.append(new Node('div')); }
  newScene();
  c.document.createElement = tag => new Node(tag);
  c.document.getElementById = id => descendants(body).find(n => n.id === id) ?? null;
  c.requestAnimationFrame = fn => { const id = ++sequence; frames.set(id, fn); return id; };
  c.cancelAnimationFrame = id => frames.delete(id);
  c.setTimeout = fn => { const id = ++sequence; timers.set(id, fn); return id; };
  c.clearTimeout = id => timers.delete(id);
  c.Save = { onLoad: { add: fn => loads.add(fn), delete: fn => loads.delete(fn) } };
  c.Wikifier = function(output, wiki) { const name = /^<<([^>]+)>>$/.exec(wiki)?.[1]; if (!h.macroRegistry.has(name)) throw Error('Unexpected fixture macro'); h.macroRegistry.get(name).handler.call({ output }); };
  c.State.variables = enabledState({ combat: 1, CE_EnemyStateEnable: true, enemyhealth: 50, enemyhealthmax: 100, enemyarousal: 20, enemyarousalmax: 100, enemyanger: 150, enemyangermax: 200, enemytrust: 250, NPCList: [{ id: 1, health: 50, healthmax: 100 }], ...extra });
  h.load('scripts/CE_EnemyState.js');
  function flushFrames() { for (let i = 0; frames.size; i++) { assert.ok(i < 10); const batch = [...frames.values()]; frames.clear(); batch.forEach(fn => fn()); } }
  function flushTimers() { const batch = [...timers.values()]; timers.clear(); batch.forEach(fn => fn()); }
  function show() { h.emit(':passagestart'); h.emit(':passagedisplay'); }
  return { ...h, body, frames, timers, loads, newScene, flushFrames, flushTimers, show, all: cls => body.querySelectorAll('.' + cls) };
}

test('navigation cancels opening animation before it writes to the detached old bar', () => {
  const h = fixture(); h.show(); h.flushFrames(); const old = h.all('ce-enemy-state-fill')[0];
  assert.equal(old.style.width, '0%'); assert.ok(h.timers.size);
  h.c.V.combat = 0; h.emit(':passagestart'); h.newScene(); h.flushTimers();
  assert.equal(old.style.width, '0%'); assert.equal(h.c.setup.CE_StateBarInitialized, false);
});

test('a tentacle-only encounter does not require an NPCList array', () => {
  const h = fixture({ NPCList: undefined, tentacles: { max: 1, active: 1, 0: { tentaclehealth: 10, tentaclehealthstart: 15 } } });
  assert.doesNotThrow(() => h.show()); h.flushFrames(); h.flushTimers();
  assert.equal(h.all('ce-tentacle-state').length, 1);
  assert.equal(h.all('ce-enemy-state-fill')[0].style.width, '67%');
});

test('nonfinite native display values never create NaN or infinite bar widths', () => {
  const h = fixture({ enemyhealth: undefined, enemyhealthmax: 0, enemyarousal: Infinity, enemyarousalmax: NaN });
  h.show(); h.flushFrames(); h.flushTimers();
  assert.ok(h.all('ce-enemy-state-fill').every(n => /^\d+%$/.test(n.style.width)));
  assert.ok(h.all('ce-enemy-state-debug').every(n => !/NaN|Infinity/.test(n.textContent)));
});

test('feature disable removes only its own DOM and fences held callbacks', () => {
  const h = fixture(); h.show(); h.flushFrames(); const old = h.all('ce-enemy-state-fill')[0], held = [...h.timers.values()];
  const foreign = h.c.document.createElement('div'); foreign.className = 'ce-enemy-state-container'; h.body.append(foreign);
  h.c.setup.CE_features.disable('enemy-state-display'); held.forEach(fn => fn());
  assert.equal(h.frames.size + h.timers.size + h.loads.size, 0);
  assert.equal(old.style.width, '0%'); assert.deepEqual(h.all('ce-enemy-state-container'), [foreign]);
});

test('rounded values, soft caps, multiple-NPC folding and repeat display retain the original UI contract', () => {
  const h = fixture({ enemyhealth: 49.5, NPCList: [{ id: 1, health: 49.5, healthmax: 100 }, null, { id: 2, health: 25, healthmax: 100 }] });
  const original = JSON.stringify(h.c.V);
  h.show(); h.flushFrames(); h.flushTimers();
  assert.deepEqual(h.all('ce-enemy-state-fill').map(n => n.style.width), ['50%', '20%', '75%', '100%', '50%', '25%']);
  assert.deepEqual(h.all('ce-enemy-state-debug').slice(0, 4).map(n => n.textContent), [': 50 / 100', ': 20 / 100', ': 150 / 200', ': 250 / 100']);
  const content = h.all('ce-npc-healthbars-content')[0], button = h.all('ce-npc-healthbars-container')[0].children[0];
  assert.equal(content.style.display, 'none'); button.onclick(); assert.equal(content.style.display, 'block');
  h.c.V.enemyhealth = 20; h.emit(':passagedisplay'); h.flushFrames(); h.flushTimers();
  assert.equal(h.all('ce-enemy-state-container').length, 2);
  assert.equal(h.all('ce-enemy-state-fill')[0].style.width, '20%');
  h.c.V.enemyhealth = 49.5; assert.equal(JSON.stringify(h.c.V), original);
});

test('native onLoad cancels the old scene before State replacement and enable rebinds once', () => {
  const h = fixture(); h.show(); const old = h.all('ce-enemy-state-fill')[0], held = [...h.frames.values()];
  assert.equal(h.loads.size, 1); for (const fn of h.loads) fn();
  assert.equal(h.all('ce-enemy-state-container').length, 0); assert.equal(h.frames.size, 0);
  h.c.State.variables = enabledState({ combat: 0 }); h.newScene(); held.forEach(fn => fn());
  assert.equal(old.style.width, '0%'); assert.equal(h.frames.size, 0);
  h.c.setup.CE_features.disable('enemy-state-display'); h.c.setup.CE_features.enable('enemy-state-display');
  assert.equal(h.loads.size, 1); h.show(); assert.equal(h.all('ce-enemy-state-container').length, 0);
});

test('the original preference refresh hides immediately and suppresses manual macros while off', () => {
  const h = fixture(); h.show(); h.flushFrames(); h.c.V.CE_EnemyStateEnable = false;
  h.c.setup.CE_enemyState.refresh(); h.flushTimers();
  assert.equal(h.all('ce-enemy-state-container').length, 0);
  const output = h.c.document.createElement('div');
  h.macroRegistry.get('CE_EnemyState').handler.call({ output }); assert.equal(output.children.length, 0);
  h.c.V.CE_EnemyStateEnable = true; h.c.setup.CE_enemyState.refresh();
  assert.equal(h.all('ce-enemy-state-container').length, 1);
});

test('provider removal failure leaves old callbacks inert and UI gone', () => {
  const h = fixture(); h.show(); h.flushFrames(); const held = [...h.timers.values()], old = h.all('ce-enemy-state-fill')[0];
  h.c.Save.onLoad.delete = () => { throw Error('save provider refused'); };
  assert.throws(() => h.c.setup.CE_features.disable('enemy-state-display'), /save provider refused/);
  held.forEach(fn => fn()); for (const fn of h.loads) fn(); h.show();
  assert.equal(old.style.width, '0%'); assert.equal(h.all('ce-enemy-state-container').length, 0);
  assert.equal(h.c.setup.CE_features.isEnabled('enemy-state-display'), false);
});
