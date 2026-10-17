import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { host, enabledState } from './hooks-host.mjs';

const initial = () => enabledState({
  pain: 20, trauma: 20, control: 20, stress: 20, arousal: 20, tiredness: 20,
  oxygen: 100, angelBanish: 100, wardrobe: { space: 200 },
  CE_painMultiplier: 2, CE_painNegativeMultiplier: 0.5,
  CE_tiredMultiplier: 3, CE_tiredNegativeMultiplier: 0.25,
  CE_lockOxygenEnabled: true, CE_noAngelBanishLoss: true,
});

test('real status module preserves R1.2 arithmetic, settings and Macro bypass', () => {
  const run = legacy => {
    const h = host(); const { c } = h;
    c.State.variables = initial();
    if (legacy) vm.runInContext(execFileSync('git', ['show', '0a56aa4:scripts/CE_statControl.js'], { encoding: 'utf8' }), c);
    else h.load('scripts/CE_statControl.js');
    h.emit(':passagestart');
    const values = [];
    c.V.pain = 30; values.push(c.V.pain);
    c.V.pain -= 10; values.push(c.V.pain);
    c.V.tiredness += 10; values.push(c.V.tiredness);
    c.V.oxygen -= 5; values.push(c.V.oxygen);
    c.V.angelBanish -= 5; values.push(c.V.angelBanish);
    c.V.CE_lockOxygenEnabled = false;
    c.V.oxygen -= 5; values.push(c.V.oxygen);
    c.V.bigest_wardrobe_swich = true; c.V.bigest_wardrobe_fix = 500;
    c.V.wardrobe.space = 300; values.push(c.V.wardrobe.space);
    c.V.wardrobe.space = 500; values.push(c.V.wardrobe.space);
    c.setup.CE_macroLock = true;
    c.V.pain += 10; values.push(c.V.pain);
    c.setup.CE_macroLock = false;
    c.V.CE_VarHook_enable = false;
    c.V.pain += 10; values.push(c.V.pain);
    return values;
  };
  assert.deepEqual(run(false), run(true));
  assert.deepEqual(run(false), [40, 35, 50, 100, 100, 95, 200, 500, 45, 55]);
});

test('status lifecycle releases only its owner, keeps custom priority and binds the next State', () => {
  const h = host(); const { c } = h;
  c.State.variables = initial();
  c.VarHook.register('oxygen', 1, 1, { owner: 'runtime:external', transform: () => 75 });
  h.load('scripts/CE_statControl.js'); h.emit(':passagestart');
  c.V.oxygen = 70; assert.equal(c.V.oxygen, 75);
  assert.equal(c.setup.CE_features.enable('status'), false);
  assert.equal(c.setup.CE_features.disable('status'), true);
  assert.equal(c.setup.CE_features.disable('status'), false);
  c.V.oxygen = 60; assert.equal(c.V.oxygen, 75);
  c.V.pain = 30; assert.equal(c.V.pain, 30);
  c.VarHook.unregisterOwner('runtime:external');
  c.V.oxygen = 60; assert.equal(c.V.oxygen, 60);
  assert.equal(Object.getOwnPropertyDescriptor(c.V, 'pain').set, undefined);
  c.setup.CE_features.enable('status');
  c.V.oxygen = 50; assert.equal(c.V.oxygen, 60);
  const stale = c.V;
  c.State.variables = initial();
  stale.pain = 35; assert.equal(stale.pain, 35);
  h.emit(':passagestart');
  c.V.pain = 30; assert.equal(c.V.pain, 40);
  assert.equal(c.V.oxygen, 100);
  c.setup.CE_features.unregister('status');
  assert.throws(() => c.setup.CE_features.enable('status'), /Unknown feature/);
});
