import test from 'node:test';
import assert from 'node:assert/strict';
import { enabledState, host, rule } from './hooks-host.mjs';

for (const type of ['VarHook', 'RawHook', 'DeepProxyHook']) {
  function fixture() {
    const h = host({ custom: true }), c = h.c;
    const sample = () => type === 'DeepProxyHook' ? { value: 10 } : 10;
    const saved = rule(type);
    const runtime = rule(type, {
      saved: false, runtimeId: 'runtime-T',
      mode: type === 'VarHook' ? 'multiplier' : 'forceValue',
      posMult: 2, negMult: 2, value: 42,
    });
    const runtimeValue = type === 'VarHook' ? 12 : 42;
    function state(hooks = []) {
      c.State.variables = enabledState({ sample: sample(), CE_customHooks: hooks });
      h.emit(':passagestart');
    }
    function write(expected) {
      // Reset without applying effects; the next write must execute the winner.
      c.setup.CE_macroLock = true;
      if (type === 'DeepProxyHook') c.V.sample.value = 10;
      else c.V.sample = 10;
      c.setup.CE_macroLock = false;
      if (type === 'DeepProxyHook') c.V.sample.value = 11;
      else c.V.sample = 11;
      assert.equal(type === 'DeepProxyHook' ? c.V.sample.value : c.V.sample, expected);
    }
    return { h, c, saved, runtime, state, write, runtimeValue };
  }

  test(`F3 ${type}: A→B→A preserves explicit order; updates, disabling and recreation remain intentional`, () => {
    const { h, c, saved, runtime, state, write, runtimeValue } = fixture();
    state([saved]);
    c.setup.CE_registerCustomHookConfig(runtime); c.setup.CE_installAllCustomHooks();
    write(runtimeValue);
    state(); write(runtimeValue);
    state([structuredClone(saved)]); write(runtimeValue);
    h.emit(':passagestart'); write(runtimeValue);

    const current = c.V.CE_customHooks[0];
    c.setup.CE_registerCustomHookConfig(current); c.setup.CE_installAllCustomHooks();
    write(10);
    state(); write(runtimeValue);
    state([structuredClone(saved)]); write(10);
    c.V.CE_customHooks[0].enabled = false; h.emit(':passagestart'); write(runtimeValue);
    c.setup.CE_registerCustomHookConfig(runtime); c.setup.CE_installAllCustomHooks();
    c.V.CE_customHooks[0].enabled = true; h.emit(':passagestart'); write(runtimeValue);
    c.setup.CE_registerCustomHookConfig(c.V.CE_customHooks[0]); c.setup.CE_installAllCustomHooks();
    write(10);
    c.setup.CE_unregisterCustomHookConfig(c.V.CE_customHooks[0]);
    c.setup.CE_removeCustomHook(saved.id); write(runtimeValue);
    const recreated = c.setup.CE_saveCustomHook(structuredClone(saved));
    c.setup.CE_registerCustomHookConfig(recreated); c.setup.CE_installAllCustomHooks(); write(10);
  });

  test(`F3 ${type}: copied IDs with different definitions have separate ranks; a new document starts from list order`, () => {
    const { c, saved, runtime, state, write, runtimeValue } = fixture();
    state([saved]);
    c.setup.CE_registerCustomHookConfig(runtime);
    c.setup.CE_registerCustomHookConfig(saved); c.setup.CE_installAllCustomHooks(); write(10);
    const otherDefinition = { ...saved,
      mode: type === 'VarHook' ? 'multiplier' : 'forceValue',
      posMult: 3, negMult: 3, value: 77,
    };
    state([otherDefinition]); write(runtimeValue);
    state([structuredClone(saved)]); write(10);

    const fresh = fixture();
    fresh.state([structuredClone(saved), { ...runtime, id: 'second-saved', saved: true }]);
    fresh.write(runtimeValue);
    // Old explicit precedence cannot survive a document restart.
    fresh.state([structuredClone(saved)]); fresh.write(10);
  });
}
