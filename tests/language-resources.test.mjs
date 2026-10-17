import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { host } from './hooks-host.mjs';

function fixture() {
  const h = host(), { c } = h, observers = [];
  class Node {
    constructor(tag, value = '') { this.nodeType = tag === '#text' ? 3 : 1; this.tagName = tag.toUpperCase(); this.nodeValue = value; this.children = []; }
    get firstChild() { return this.children[0]; }
    get nextSibling() { return this.parentElement?.children[this.parentElement.children.indexOf(this) + 1]; }
    append(node) { node.parentElement = this; this.children.push(node); return node; }
    matches() { return this.ce === true; }
    closest() { return this.ce ? this : this.parentElement?.closest() ?? null; }
    contains(node) { return this === node || this.children.some(child => child.contains(node)); }
    querySelectorAll() { return this.children.flatMap(child => [...(child.ce ? [child] : []), ...child.querySelectorAll()]); }
  }
  const body = new Node('body'), root = body.append(new Node('div')); root.ce = true;
  const text = root.append(new Node('#text', '舊體'));
  const input = root.append(new Node('input')); input.type = 'text'; input.value = '舊體'; input.placeholder = '舊體';
  c.document.body = body; c.document.readyState = 'complete'; c.document.removeEventListener = () => {};
  c.CE_T2S_DICT = { 舊: '旧', 體: '体', 新: '新' }; c.CE_T2S_PHRASES = {};
  c.V.CE_langMode = 's';
  c.MutationObserver = class { constructor(callback) { this.callback = callback; observers.push(this); } observe() {} disconnect() { this.disconnected = true; } };
  if (process.env.CE_TEST_LANGUAGE_BASELINE === '1') vm.runInContext(execFileSync('git', ['show', '3a876a8cae03343f51113c76084db7222eecd007:scripts/lan_t2s/CE_lang.js'], { encoding: 'utf8' }), c);
  else h.load('scripts/lan_t2s/CE_lang.js');
  return { ...h, text, input, observers, root, Node };
}

test('language conversion rebases changed text rather than replaying the first cached label', () => {
  const h = fixture(); assert.equal(h.text.nodeValue, '旧体');
  h.text.nodeValue = '新體'; h.observers[0].callback([{ type: 'characterData', target: h.text }]); assert.equal(h.text.nodeValue, '新体');
  h.c.V.CE_langMode = 't'; h.c.CE_refreshLang(); assert.equal(h.text.nodeValue, '新體');
});

for (const tag of ['pre', 'code', 'textarea', 'script', 'style']) {
  test(`excluded ${tag} ancestors protect existing, added text and nested elements`, () => {
    const h = fixture(), region = h.root.append(new h.Node(tag));
    const text = region.append(new h.Node('#text', '舊體'));
    h.c.CE_refreshLang(); assert.equal(text.nodeValue, '舊體');
    text.nodeValue = '新體';
    h.observers[0].callback([{ type: 'characterData', target: text }]);
    assert.equal(text.nodeValue, '新體');
    const added = region.append(new h.Node('#text', '舊體'));
    h.observers[0].callback([{ type: 'childList', addedNodes: [added] }]);
    assert.equal(added.nodeValue, '舊體');
    const span = region.append(new h.Node('span')), nested = span.append(new h.Node('#text', '舊體'));
    h.observers[0].callback([{ type: 'childList', addedNodes: [span] }]);
    assert.equal(nested.nodeValue, '舊體');
    h.c.setup.CE_features.disable('ce-language'); h.c.setup.CE_features.enable('ce-language');
    assert.equal(text.nodeValue, '新體'); assert.equal(nested.nodeValue, '舊體');
  });
}
test('language projection leaves editable input values untouched', () => {
  const h = fixture(); assert.equal(h.input.value, '舊體'); assert.equal(h.input.placeholder, '旧体');
});
test('language disable disconnects and restores only owned text; held callbacks remain inactive', () => {
  const h = fixture(), callback = h.observers[0].callback;
  h.c.setup.CE_features.disable('ce-language'); assert.equal(h.text.nodeValue, '舊體');
  assert.equal(h.observers[0].disconnected, true);
  h.text.nodeValue = '新體'; callback([{ type: 'characterData', target: h.text }]); assert.equal(h.text.nodeValue, '新體');
  h.c.setup.CE_features.enable('ce-language'); assert.equal(h.text.nodeValue, '新体');
  h.text.nodeValue = '舊體'; callback([{ type: 'characterData', target: h.text }]);
  assert.equal(h.text.nodeValue, '舊體', 'a disconnected observer stays stale after re-enable');
});
