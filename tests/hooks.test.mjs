import test from 'node:test';
import assert from 'node:assert/strict';
import { enabledState, host, rule } from './hooks-host.mjs';

test('DeepProxy unregister makes existing root and child aliases pass through immediately', () => {
  const { c } = host();
  c.V.sample = { value: 1, child: { value: 1 } };
  c.DeepProxyHook.register('sample', { transform: ctx => ctx.oldValue, delete: () => false });
  c.DeepProxyHook.installAll();
  const root = c.V.sample;
  const child = root.child;
  root.value = 2;
  assert.equal(root.value, 1);
  c.DeepProxyHook.unregister('sample');
  root.value = 3;
  child.value = 4;
  assert.equal(root.value, 3);
  assert.equal(child.value, 4);
  assert.equal(Reflect.deleteProperty(child, 'value'), true);
  assert.equal('value' in child, false);
});

test('DeepProxy updates config once, avoids stacked proxies and retires stale aliases', () => {
  const h = host(); const { c } = h;
  c.V.sample = { value: 0 };
  let first = 0, second = 0;
  c.DeepProxyHook.register('sample', { transform: ctx => { first++; return ctx.newValue * 2; } });
  c.DeepProxyHook.installAll();
  const stale = c.V.sample;
  c.V.sample.value = 1;
  c.DeepProxyHook.register('sample', { transform: ctx => { second++; return ctx.newValue * 3; } });
  c.DeepProxyHook.installAll();
  c.V.sample.value = 3;
  assert.equal(c.V.sample.value, 9);
  assert.equal(first, 1);
  assert.equal(second, 1);
  stale.value = 7;
  assert.equal(c.V.sample.value, 7);
  for (let i = 0; i < 3; i++) h.emit(':passagestart');
  c.V.sample.value = 3;
  assert.equal(c.V.sample.value, 9);
  assert.equal(second, 2);
});

test('DeepProxy retires replaced parents and replaced State before rebinding', () => {
  const { c } = host();
  c.V.parent = { sample: { value: 0 } };
  c.DeepProxyHook.register('parent.sample', { transform: () => 99 });
  c.DeepProxyHook.installAll();
  const old = c.V.parent.sample;
  c.V.parent = { sample: { value: 0 } };
  old.value = 1;
  assert.equal(old.value, 1);
  c.DeepProxyHook.installAll();
  c.V.parent.sample.value = 1;
  assert.equal(c.V.parent.sample.value, 99);
  const previous = c.V.parent.sample;
  c.State.variables = enabledState({ parent: { sample: { value: 0 } } });
  previous.value = 2;
  assert.equal(previous.value, 2);
  c.DeepProxyHook.installAll();
  c.V.parent.sample.value = 2;
  assert.equal(c.V.parent.sample.value, 99);
});

for (const type of ['VarHook', 'RawHook', 'DeepProxyHook']) {
  test(`${type}: saved A→B→A reconciliation removes only saved rules and preserves builtins`, () => {
    const h = host({ custom: true }); const { c } = h;
    function sample() { return type === 'DeepProxyHook' ? { value: 10 } : 10; }
    const a = enabledState({ sample: sample(), CE_customHooks: [rule(type)] });
    c.State.variables = a;
    if (type === 'VarHook') c.VarHook.register('sample', 2, 2);
    else c[type].register('sample', { transform: ctx => ctx.newValue + 1 });
    h.emit(':passagestart');
    const write = value => {
      if (type === 'DeepProxyHook') c.V.sample.value = value;
      else c.V.sample = value;
    };
    const read = () => type === 'DeepProxyHook' ? c.V.sample.value : c.V.sample;
    write(11); assert.equal(read(), 10);
    const b = enabledState({ sample: sample() });
    c.State.variables = b;
    h.emit(':passagestart');
    write(11); assert.equal(read(), 12);
    c.State.variables = enabledState({ sample: sample(), CE_customHooks: [rule(type)] });
    h.emit(':passagestart');
    write(11); assert.equal(read(), 10);
    c.V.CE_customHooks[0].enabled = false;
    h.emit(':passagestart');
    write(11); assert.equal(read(), 12);
  });

  test(`${type}: unregister one custom owner leaves the other same-path rule intact`, () => {
    const { c } = host({ custom: true });
    c.V.sample = type === 'DeepProxyHook' ? { value: 10 } : 10;
    const first = rule(type, { id: 'first' });
    const second = rule(type, { id: 'second', mode: type === 'VarHook' ? 'multiplier' : 'forceValue', value: 42, posMult: 2, negMult: 2 });
    c.setup.CE_registerCustomHookConfig(first);
    c.setup.CE_registerCustomHookConfig(second);
    c.setup.CE_installAllCustomHooks();
    c.setup.CE_unregisterCustomHookConfig(first);
    if (type === 'DeepProxyHook') c.V.sample.value = 11;
    else c.V.sample = 11;
    assert.equal(type === 'DeepProxyHook' ? c.V.sample.value : c.V.sample, type === 'VarHook' ? 12 : 42);
  });
}

test('saved custom-code permission revocation disables it before the next passage', () => {
  const { c } = host({ custom: true });
  c.V.sample = 10; c.V.debug = 1; c.V.CE_allowCustomHookSave = true;
  const config = rule('RawHook', { mode: 'custom', customCode: 'return 999;' });
  c.setup.CE_registerCustomHookConfig(config);
  c.setup.CE_installAllCustomHooks();
  c.V.sample = 11; assert.equal(c.V.sample, 999);
  c.V.CE_allowCustomHookSave = false;
  c.V.sample = 12; assert.equal(c.V.sample, 12);
});

test('runtime custom rules retain their document-session semantics during saved-rule reconciliation', () => {
  const h = host({ custom: true }); const { c } = h;
  c.V.sample = 10;
  const config = rule('RawHook', { saved: false, runtimeId: 'runtime-only' });
  c.setup.CE_addRuntimeCustomHook(config);
  c.setup.CE_registerCustomHookConfig(c.setup.CE_runtimeCustomHooks[0]);
  c.setup.CE_installAllCustomHooks();
  c.State.variables = enabledState({ sample: 20 });
  h.emit(':passagestart');
  c.V.sample = 21; assert.equal(c.V.sample, 20);
  assert.equal(c.setup.CE_runtimeCustomHooks.length, 1);
});

test('nested macro returns/throws preserve the outer lock and the caller context', () => {
  const { c, macroRegistry } = host({ macros: true });
  const observed = [];
  macroRegistry.set('inner', { handler() { observed.push(c.setup.CE_macroLock); return this.args[0]; } });
  macroRegistry.set('outer', { handler() {
    assert.equal(macroRegistry.get('inner').handler.call({ args: [7] }), 7);
    observed.push(c.setup.CE_macroLock);
    assert.equal(this.marker, 'kept');
    return 42;
  } });
  const options = { cheatVar: 'CE_test', multiplierVar: 'CE_testMultiplier' };
  c.CE_MacroHook.hookMacro('inner', options);
  c.CE_MacroHook.hookMacro('outer', options);
  c.setup.CE_macroLock = false;
  assert.equal(macroRegistry.get('outer').handler.call({ args: [], marker: 'kept' }), 42);
  assert.deepEqual(observed, [true, true]);
  assert.equal(c.setup.CE_macroLock, false);
  macroRegistry.set('failure', { handler() { throw Error('expected'); } });
  c.CE_MacroHook.hookMacro('failure', options);
  c.setup.CE_macroLock = true;
  assert.throws(() => macroRegistry.get('failure').handler.call({ args: [] }), /expected/);
  assert.equal(c.setup.CE_macroLock, true);
});

for (const type of ['RawHook', 'VarHook']) {
  test(`${type}: old accessor aliases stop transforming after parent or State replacement`, () => {
    const { c } = host();
    c.V.parent = { sample: 10 };
    if (type === 'VarHook') c[type].register('parent.sample', 2, 2);
    else c[type].register('parent.sample', { transform: () => 99 });
    c[type].installAll();
    const staleParent = c.V.parent;
    c.V.parent = { sample: 20 };
    staleParent.sample = 11;
    assert.equal(staleParent.sample, 11);
    c[type].installAll();
    c.V.parent.sample = 21;
    assert.equal(c.V.parent.sample, type === 'VarHook' ? 22 : 99);
    const staleState = c.V;
    c.State.variables = enabledState({ parent: { sample: 30 } });
    staleState.parent.sample = 23;
    assert.equal(staleState.parent.sample, 23);
    c[type].installAll();
    c.V.parent.sample = 31;
    assert.equal(c.V.parent.sample, type === 'VarHook' ? 32 : 99);
  });
}

test('real built-in registration on the first passage cannot erase a saved custom owner', () => {
  const h = host({ custom: true }); const { c } = h;
  c.V.pain = 10; c.V.CE_painMultiplier = 2; c.V.CE_painNegativeMultiplier = 2;
  c.V.CE_customHooks = [rule('VarHook', { path: 'pain' })];
  h.load('scripts/CE_statControl.js');
  h.emit(':passagestart');
  c.V.pain = 11; assert.equal(c.V.pain, 10);
  c.setup.CE_unregisterCustomHookConfig(c.V.CE_customHooks[0]);
  c.V.pain = 11; assert.equal(c.V.pain, 12);
});

test('canonical saved/runtime IDs survive replacement, promotion and deletion', () => {
  const { c } = host({ custom: true });
  c.V.sample = { value: 10 };
  const first = c.setup.CE_addRuntimeCustomHook(rule('DeepProxyHook', { saved: false, mode: 'forceValue', value: 40 }));
  c.setup.CE_registerCustomHookConfig(first); c.setup.CE_installAllCustomHooks();
  const second = c.setup.CE_addRuntimeCustomHook(rule('DeepProxyHook', { saved: false, mode: 'forceValue', value: 50 }));
  assert.equal(second.runtimeId, first.runtimeId);
  c.setup.CE_registerCustomHookConfig(second); c.setup.CE_installAllCustomHooks();
  c.V.sample.value = 11; assert.equal(c.V.sample.value, 50);
  c.setup.CE_promoteRuntimeCustomHook(second.runtimeId);
  assert.equal(c.setup.CE_runtimeCustomHooks.length, 0);
  const stored = c.V.CE_customHooks[0];
  c.setup.CE_unregisterCustomHookConfig(stored);
  c.setup.CE_removeCustomHook(stored.id);
  c.V.sample.value = 12; assert.equal(c.V.sample.value, 12);
  assert.equal(c.V.CE_customHooks.length, 0);
});

test('legacy positive/negative multipliers, disable flags and macro bypass retain their behavior', () => {
  const { c } = host();
  c.V.sample = 10;
  c.VarHook.register('sample', 2, 3); c.VarHook.installAll();
  c.V.sample = 12; assert.equal(c.V.sample, 14);
  c.V.sample = 13; assert.equal(c.V.sample, 11);
  c.setup.CE_macroLock = true;
  c.V.sample = 12; assert.equal(c.V.sample, 12);
  c.setup.CE_macroLock = false; c.V.CE_VarHook_enable = false;
  c.V.sample = 13; assert.equal(c.V.sample, 13);
});

test('passage reconciliation preserves the priority of the last explicit user registration', () => {
  const h = host({ custom: true }); const { c } = h;
  c.V.sample = 10;
  c.V.CE_customHooks = [rule('VarHook')];
  h.emit(':passagestart');
  const runtime = c.setup.CE_addRuntimeCustomHook(rule('VarHook', { saved: false, mode: 'multiplier', posMult: 2, negMult: 2 }));
  c.setup.CE_registerCustomHookConfig(runtime); c.setup.CE_installAllCustomHooks();
  c.V.sample = 11; assert.equal(c.V.sample, 12);
  h.emit(':passagestart');
  c.V.sample = 13; assert.equal(c.V.sample, 14);
  c.setup.CE_registerCustomHookConfig(c.V.CE_customHooks[0]); c.setup.CE_installAllCustomHooks();
  c.V.sample = 15; assert.equal(c.V.sample, 14);
  h.emit(':passagestart');
  c.V.sample = 15; assert.equal(c.V.sample, 14);
});

for (const type of ['VarHook', 'RawHook', 'DeepProxyHook']) {
  test(`${type}: promoting a disabled rule replaces the old saved owner without leaving its lock`, () => {
    const { c } = host({ custom: true });
    c.V.sample = type === 'DeepProxyHook' ? { value: 10 } : 10;
    const saved = c.setup.CE_saveCustomHook(rule(type));
    c.setup.CE_registerCustomHookConfig(saved); c.setup.CE_installAllCustomHooks();
    const runtime = c.setup.CE_addRuntimeCustomHook(rule(type, { saved: false, enabled: false }));
    c.setup.CE_promoteRuntimeCustomHook(runtime.runtimeId);
    assert.equal(c.V.CE_customHooks[0].enabled, false);
    if (type === 'DeepProxyHook') c.V.sample.value = 11;
    else c.V.sample = 11;
    assert.equal(type === 'DeepProxyHook' ? c.V.sample.value : c.V.sample, 11);
  });

  test(`${type}: a missing path in a new State can be rebound when it returns`, () => {
    const h = host(); const { c } = h;
    c.V.parent = { sample: type === 'DeepProxyHook' ? { value: 10 } : 10 };
    if (type === 'VarHook') c[type].register('parent.sample', 2, 2);
    else c[type].register('parent.sample', { transform: ctx => ctx.newValue + 1 });
    c[type].installAll();
    c.State.variables = enabledState(); h.emit(':passagestart');
    c.V.parent = { sample: type === 'DeepProxyHook' ? { value: 10 } : 10 };
    c[type].installAll();
    if (type === 'DeepProxyHook') c.V.parent.sample.value = 11;
    else c.V.parent.sample = 11;
    assert.equal(type === 'DeepProxyHook' ? c.V.parent.sample.value : c.V.parent.sample, 12);
  });
}
