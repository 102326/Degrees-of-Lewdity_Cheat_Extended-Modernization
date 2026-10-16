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
  await assert.rejects(createArchive(root, originalWithPatch), /Missing declared resource: addon-replace\/Widgets State Man_1.txt/);
  const missingPatch = structuredClone(boot);
  missingPatch.additionFile = missingPatch.additionFile.filter(name => !name.endsWith('Widgets_6.txt'));
  await assert.rejects(createArchive(root, missingPatch), /Patch resource is not declared/);
  assert.throws(() => manifestFiles({ ...boot, additionFile: ['../outside.txt'] }), /Unsafe resource path/);
});

test('early, normal and Twee contracts preserve order and all 30 original Patch declarations', () => {
  for (const key of ['scriptFileList_inject_early', 'tweeFileList', 'styleFileList', 'dependenceInfo', 'addonPlugin']) {
    assert.deepEqual(boot[key], original[key], key);
  }
  const expected = [...original.scriptFileList];
  expected.splice(expected.indexOf('scripts/CE_hookTool.js'), 0, 'scripts/CE_hookRegistry.js');
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
