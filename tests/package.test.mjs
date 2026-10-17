import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import JSZip from 'jszip';
import { createArchive, manifestFiles, patchFiles } from '../build/package.mjs';
import { baseline } from './hooks-host.mjs';

const root = process.cwd();
const boot = JSON.parse(await readFile('boot.json', 'utf8'));
const original = JSON.parse(execFileSync('git', ['show', `${baseline}:boot.json`], { encoding: 'utf8' }));

test('original manifest reproduces the missing input; current manifest rejects undeclared Patch files', async () => {
  await assert.rejects(createArchive(root, original), /Patch resource is not declared: addon-replace\/Widgets_6.txt/);
  const originalWithPatch = structuredClone(original);
  originalWithPatch.additionFile.push('addon-replace/Widgets_6.txt');
  originalWithPatch.scriptFileList = originalWithPatch.scriptFileList.map(name =>
    name === 'scripts/CE_hookTool.js' ? 'scripts/core/CE_hookCore.js' : name);
  await assert.rejects(createArchive(root, originalWithPatch), /Missing declared resource: addon-replace\/Widgets State Man_1.txt/);
  const missingPatch = structuredClone(boot);
  missingPatch.additionFile = missingPatch.additionFile.filter(name => !name.endsWith('Widgets_6.txt'));
  await assert.rejects(createArchive(root, missingPatch), /Patch resource is not declared/);
  assert.throws(() => manifestFiles({ ...boot, additionFile: ['../outside.txt'] }), /Unsafe resource path/);
});

test('early, normal and Twee contracts preserve order and all 30 original Patch declarations', () => {
  for (const key of ['tweeFileList', 'styleFileList']) {
    assert.deepEqual(boot[key], original[key], key);
  }
  const expectedAddons = structuredClone(original.addonPlugin);
  const findMoney = addons => addons.find(a => a.modName === 'ReplacePatcher').params.js.find(p => p.TODO === 'function=>hook money');
  // Changed boundaries have behavior checks using the actual replacement, not copied strings.
  findMoney(expectedAddons).to = findMoney(boot.addonPlugin).to;
  const findHourly = addons => addons.find(a => a.modName === 'ReplacePatcher').params.js.find(p => p.TODO === 'function=>patch earnHourlyFeats');
  findHourly(expectedAddons).to = findHourly(boot.addonPlugin).to;
  const findParasite = addons => addons.find(a => a.modName === 'ReplacePatcher').params.js.find(p => p.TODO === 'patch => maxParasites');
  findParasite(expectedAddons).to = findParasite(boot.addonPlugin).to;
  assert.deepEqual(boot.addonPlugin, expectedAddons);
  assert.deepEqual(boot.scriptFileList_inject_early, original.scriptFileList_inject_early.filter(name => !name.endsWith('framework_detector.js')));
  assert.deepEqual(boot.dependenceInfo, [
    ...original.dependenceInfo.filter(d => !['SweetAlert2Mod', 'ModLoader DoL ImageLoaderHook'].includes(d.modName)),
    {modName: 'maplebirch', version: '>=3.2.5'},
  ]);
  const expected = [...original.scriptFileList];
  expected.splice(expected.indexOf('scripts/CE_hookTool.js'), 0, 'scripts/CE_hookRegistry.js');
  expected[expected.indexOf('scripts/CE_hookTool.js')] = 'scripts/core/CE_hookCore.js';
  expected.unshift('scripts/core/CE_features.js');
  expected.splice(expected.indexOf('scripts/CE_hookSimpleUI.js'), 0, 'scripts/core/CE_customHooks.js');
  expected.splice(expected.indexOf('scripts/CE_macroHookTool.js'), 0, 'scripts/core/CE_macroCore.js');
  expected.splice(expected.indexOf('scripts/CE_MoneyCheat.js'), 1);
  expected.splice(expected.indexOf('scripts/CE_statControl.js') + 1, 0, 'scripts/CE_MoneyCheat.js');
  expected.splice(expected.indexOf('scripts/CE_customerSkinColor.js'), 0, 'scripts/CE_customColours.js', 'scripts/CE_appearanceRendering.js');
  expected.splice(expected.indexOf('scripts/CE_forestMapGui.js'), 0, 'scripts/CE_mapView.js');
  assert.deepEqual(boot.scriptFileList, expected);
  assert.equal(boot.name, original.name);
  assert.equal(patchFiles(boot).length, 7);
});

test('actual ZIP is deterministic, CRC-readable, complete, and retains upstream license bytes', async () => {
  const a = await createArchive(root, boot);
  const b = await createArchive(root, boot);
  assert.ok(a.bytes.equals(b.bytes));
  const zip = await JSZip.loadAsync(a.bytes, { checkCRC32: true });
  assert.deepEqual(Object.keys(zip.files).sort(), [...manifestFiles(boot), 'boot.json'].sort());
  for (const file of patchFiles(boot)) assert.ok(zip.file(file));
  assert.equal(await zip.file('LICENSE.txt').async('string'), execFileSync('git', ['show', `${baseline}:LICENSE.txt`], { encoding: 'utf8' }));
  assert.ok(zip.file('R1-NOTICE.md'));
  assert.ok(zip.file('scripts/lan_t2s/README.md'));
});
