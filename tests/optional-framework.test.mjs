import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import vm from 'node:vm';
import { baseline } from './hooks-host.mjs';

test('four real optional queries preserve decisions across 16 registry scenarios without false errors', () => {
  const members = [
    ['scripts/CE_sideBarIcon.js', ['simpleMod']],
    ['scripts/CE_tattoo.js', ['maplebirchMod', 'simpleMod']],
    ['scripts/CE_TimeTravelPlus.js', ['hasSimpleFramework']],
  ];
  let checks = 0;
  for (const [file, variables] of members) {
    const before = execFileSync('git', ['show', `${baseline}:${file}`], { encoding: 'utf8' });
    const after = readFileSync(file, 'utf8');
    for (const variable of variables) {
      const expression = text => {
        const matches = [...text.matchAll(new RegExp(`const ${variable}\\s*=\\s*([^;]+);`, 'g'))];
        assert.equal(matches.length, 1);
        return matches[0][1];
      };
      for (const names of [[], ['maplebirch'], ['Simple Frameworks'], ['maplebirch', 'Simple Frameworks']]) {
        const mods = new Map(names.map(name => [name, { name }]));
        function run(text) {
          const errors = [];
          const result = vm.runInNewContext(text, { window: { modUtils: {
            getModListNameNoAlias: () => [...mods.keys()],
            getAnyModByNameNoAlias(name) { if (!mods.has(name)) errors.push(name); return mods.get(name); },
          } } });
          errors.push('unrelated error');
          return { result, errors };
        }
        const old = run(expression(before));
        const fixed = run(expression(after));
        assert.equal(fixed.result, old.result);
        assert.deepEqual(fixed.errors, ['unrelated error']);
        checks++;
      }
    }
  }
  assert.equal(checks, 16);
});
