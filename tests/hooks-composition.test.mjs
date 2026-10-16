import test from 'node:test';
import assert from 'node:assert/strict';
import { enabledState, host } from './hooks-host.mjs';

for (const type of ['VarHook', 'RawHook']) {
  test(`F1: parent Deep preserves child ${type} exactly once and still retires old targets`, () => {
    const { c } = host({ custom: true });
    let calls = 0;
    c.V.test = { x: 0 };
    if (type === 'VarHook') c.VarHook.register('test.x', 2, 2, { before: () => calls++ });
    else c.RawHook.register('test.x', { transform: ctx => { calls++; return ctx.newValue * 2; } });
    c.DeepProxyHook.register('test', {});
    c.setup.CE_installAllCustomHooks();
    c.V.test.x = 1;
    assert.equal(c.V.test.x, 2);
    assert.equal(calls, 1);
    for (let i = 0; i < 3; i++) c.setup.CE_installAllCustomHooks();
    c.V.test.x = 3;
    assert.equal(c.V.test.x, type === 'VarHook' ? 4 : 6);
    assert.equal(calls, 2);
    c.DeepProxyHook.unregister('test');
    c.V.test.x = 5;
    assert.equal(c.V.test.x, type === 'VarHook' ? 6 : 10);
    assert.equal(calls, 3);

    c.DeepProxyHook.register('test', {}); c.setup.CE_installAllCustomHooks();
    const oldParent = c.V.test;
    c.V.test = { x: 0 };
    oldParent.x = 7;
    assert.equal(oldParent.x, 7);
    assert.equal(calls, 3);
    c.setup.CE_installAllCustomHooks();
    c.V.test.x = 1;
    assert.equal(c.V.test.x, 2);
    const oldStateParent = c.V.test;
    c.State.variables = enabledState({ test: { x: 0 } });
    oldStateParent.x = 9;
    assert.equal(oldStateParent.x, 9);
    assert.equal(calls, 4);
    c.setup.CE_installAllCustomHooks();
    c.V.test.x = 1;
    assert.equal(c.V.test.x, 2);
    assert.equal(calls, 5);
  });
}

for (const order of ['parent-child', 'child-parent']) {
  test(`F2: overlapping Deep roots compose and retain separate lifetimes (${order})`, () => {
    const { c } = host();
    const trace = [];
    c.V.test = { child: { x: 0 } };
    const parent = () => { c.DeepProxyHook.register('test', {}); c.DeepProxyHook.installAll(); };
    const child = () => {
      c.DeepProxyHook.register('test.child', { transform: () => { trace.push('child'); return 99; } });
      c.DeepProxyHook.installAll();
    };
    if (order === 'parent-child') { parent(); child(); } else { child(); parent(); }
    c.V.test.child.x = 1;
    assert.equal(c.V.test.child.x, 99);
    assert.deepEqual(trace.splice(0), ['child']);

    // Both transforms run once: the ancestor wrapper feeds the descendant.
    c.DeepProxyHook.register('test', { transform: ctx => {
      if (typeof ctx.newValue !== 'number') return ctx.newValue;
      trace.push('parent'); return ctx.newValue + 1;
    } });
    c.DeepProxyHook.register('test.child', { transform: ctx => { trace.push('child'); return ctx.newValue * 10; } });
    for (let i = 0; i < 3; i++) c.DeepProxyHook.installAll();
    c.V.test.child.x = 2;
    assert.equal(c.V.test.child.x, 30);
    assert.deepEqual(trace.splice(0), ['parent', 'child']);
    c.V.test.child = c.V.test.child;
    c.V.test.child.x = 3;
    assert.equal(c.V.test.child.x, 40);
    assert.deepEqual(trace.splice(0), ['parent', 'child']);
    c.DeepProxyHook.installAll();
    c.V.test.child.x = 2;
    assert.equal(c.V.test.child.x, 30);
    assert.deepEqual(trace.splice(0), ['parent', 'child']);
    c.DeepProxyHook.unregister('test');
    c.V.test.child.x = 2;
    assert.equal(c.V.test.child.x, 20);
    assert.deepEqual(trace.splice(0), ['child']);
    parent();
    c.DeepProxyHook.unregister('test.child');
    c.DeepProxyHook.register('test', { transform: ctx => { trace.push('parent'); return ctx.newValue + 1; } });
    c.DeepProxyHook.installAll();
    c.V.test.child.x = 2;
    assert.equal(c.V.test.child.x, 3);
    assert.deepEqual(trace.splice(0), ['parent']);

    child();
    const stale = c.V.test.child;
    c.V.test = { child: { x: 0 } };
    stale.x = 4;
    assert.equal(stale.x, 4);
    assert.deepEqual(trace.splice(0), []);
    c.DeepProxyHook.installAll();
    c.V.test.child.x = 2;
    assert.equal(c.V.test.child.x, 99);
    assert.deepEqual(trace.splice(0), ['parent', 'child']);
    const previous = c.V.test.child;
    c.State.variables = enabledState({ test: { child: { x: 0 } } });
    previous.x = 5;
    assert.equal(previous.x, 5);
    assert.deepEqual(trace.splice(0), []);
    c.DeepProxyHook.installAll();
    c.V.test.child.x = 2;
    assert.equal(c.V.test.child.x, 99);
    assert.deepEqual(trace.splice(0), ['parent', 'child']);
  });
}

test('Deep does not wrap its own proxy again after an object is assigned back', () => {
  const { c } = host();
  let calls = 0;
  c.V.test = { child: { x: 0 } };
  c.DeepProxyHook.register('test', {
    transform: ctx => typeof ctx.newValue === 'number' ? (calls++, ctx.newValue * 2) : ctx.newValue,
  });
  c.DeepProxyHook.installAll();
  c.V.test.child = c.V.test.child;
  c.V.test.child.x = 1;
  assert.equal(c.V.test.child.x, 2);
  assert.equal(calls, 1);
});

test('CE wrapping retains third-party proxy traps while child accessors remain active', () => {
  const { c } = host();
  let writes = 0;
  c.V.test = new Proxy({ x: 0 }, { set: (obj, key, value, receiver) => {
    writes++; return Reflect.set(obj, key, value, receiver);
  } });
  c.VarHook.register('test.x', 2, 2);
  c.DeepProxyHook.register('test', {});
  c.VarHook.installAll(); c.DeepProxyHook.installAll();
  c.V.test.x = 1;
  assert.equal(c.V.test.x, 2);
  assert.equal(writes, 1);
});
