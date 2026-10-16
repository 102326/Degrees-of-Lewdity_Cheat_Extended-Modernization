import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

export const baseline = 'c36b23a6ab1899c7f780faa63945fe6e199a6355';
export function host({ custom = false, macros = false, legacy = process.env.CE_TEST_BASELINE === '1' } = {}) {
  const listeners = new Map();
  const macroRegistry = new Map();
  const warnings = [];
  const context = vm.createContext({
    console: { log() {}, warn(...args) { warnings.push(args); }, error(...args) { warnings.push(args); } },
    State: { variables: enabledState() }, setup: {}, document: {},
    alert() {},
    Macro: { add: (key, value) => macroRegistry.set(key, value), get: key => macroRegistry.get(key) },
    $(target) {
      assertDocument(target);
      return {
        on(name, callback) { add(name, callback, false); },
        one(name, callback) { add(name, callback, true); },
      };
    },
  });
  context.window = context;
  Object.defineProperty(context, 'V', { get: () => context.State.variables });
  function assertDocument(target) {
    if (target !== context.document) throw Error('Fixture only exposes document event subscriptions');
  }
  function add(name, callback, once) {
    for (const event of name.split(' ')) {
      const handlers = listeners.get(event) ?? [];
      handlers.push({ callback, once });
      listeners.set(event, handlers);
    }
  }
  function load(path) {
    const source = legacy
      ? execFileSync('git', ['show', `${baseline}:${path}`], { encoding: 'utf8' })
      : readFileSync(path, 'utf8');
    vm.runInContext(source, context, { filename: path });
  }
  if (!legacy) load('scripts/CE_hookRegistry.js');
  load('scripts/CE_hookTool.js');
  if (custom) load('scripts/CE_hookSimpleUI.js');
  if (macros) load('scripts/CE_macroHookTool.js');
  return {
    c: context, warnings, macroRegistry, load,
    emit(name) {
      const handlers = [...(listeners.get(name) ?? [])];
      listeners.set(name, handlers.filter(h => !h.once));
      for (const { callback } of handlers) callback();
    },
  };
}

export function enabledState(extra = {}) {
  return { CE_VarHook_enable: true, CE_RawHook_enable: true, CE_DeepProxyHook_enable: true, ...extra };
}

export function rule(type, fields = {}) {
  return { id: 'saved-rule', saved: true, enabled: true, type, path: 'sample', mode: 'lock', ...fields };
}
