import { readFile, mkdir, writeFile, realpath } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
import JSZip from 'jszip';

const requiredLists = ['styleFileList', 'scriptFileList', 'tweeFileList', 'imgFileList', 'additionFile'];
const optionalLists = ['scriptFileList_inject_early', 'scriptFileList_earlyload', 'scriptFileList_preload', 'replacePatchList', 'additionBinaryFile'];

export function manifestFiles(boot) {
  if (typeof boot.name !== 'string' || !boot.name || typeof boot.version !== 'string' || !boot.version) {
    throw Error('Manifest needs a name and version');
  }
  const files = [];
  for (const key of [...requiredLists, ...optionalLists]) {
    const list = boot[key] ?? (optionalLists.includes(key) ? [] : undefined);
    if (!Array.isArray(list) || list.some(name => typeof name !== 'string')) throw Error(`Invalid ${key}`);
    files.push(...list);
  }
  // The pinned CE contract has no directories; reject rather than omit them.
  if (boot.additionDir?.length) throw Error('additionDir is not supported by this CE packager');
  for (const name of files) {
    if (!name || name.includes('\\') || name.includes(':') || path.posix.isAbsolute(name) ||
        path.posix.normalize(name) !== name || name.split('/').includes('..')) throw Error(`Unsafe resource path: ${name}`);
  }
  return [...new Set(files)];
}

export function patchFiles(boot) {
  const found = new Set();
  function visit(value) {
    if (!value || typeof value !== 'object') return;
    if (typeof value.replaceFile === 'string') found.add(value.replaceFile);
    for (const child of Object.values(value)) visit(child);
  }
  visit(boot.addonPlugin);
  return [...found];
}

export async function createArchive(root, boot) {
  const names = manifestFiles(boot);
  const replacements = patchFiles(boot);
  for (const name of replacements) {
    if (!names.includes(name)) throw Error(`Patch resource is not declared: ${name}`);
  }
  const zip = new JSZip();
  const contents = new Map();
  const realRoot = await realpath(root);
  for (const name of names) {
    let resolved;
    try { resolved = await realpath(path.join(realRoot, name)); }
    catch { throw Error(`Missing declared resource: ${name}`); }
    if (!resolved.startsWith(realRoot + path.sep)) throw Error(`Resource escapes root: ${name}`);
    const bytes = await readFile(resolved);
    if (name.endsWith('.js')) new vm.Script(bytes.toString('utf8'), { filename: name });
    contents.set(name, bytes);
  }
  // The pinned loader merges normal scripts in declaration order as classic JS.
  new vm.Script(boot.scriptFileList.map(name => contents.get(name).toString('utf8')).join('\n'));
  contents.set('boot.json', Buffer.from(JSON.stringify(boot, null, 2) + '\n'));
  for (const [name, bytes] of contents) {
    zip.file(name, bytes, { date: new Date('2000-01-01T00:00:00Z'), createFolders: false });
  }
  const bytes = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 9 } });
  // Reopen the actual artifact; input existence alone is not ZIP membership proof.
  const checked = await JSZip.loadAsync(bytes, { checkCRC32: true });
  const members = Object.keys(checked.files);
  if (members.length !== contents.size) throw Error('Unexpected ZIP members');
  for (const [name, expected] of contents) {
    const actual = await checked.file(name)?.async('nodebuffer');
    if (!actual?.equals(expected)) throw Error(`ZIP member differs: ${name}`);
  }
  return {
    bytes,
    report: {
      name: boot.name, version: boot.version,
      sha256: createHash('sha256').update(bytes).digest('hex'),
      members, patchResources: replacements,
      stages: { declared: 'validated', packaged: 'validated; CRC and bytes', patchMatched: 'not validated', gameRuntime: 'not validated' },
      loaderReference: '933b235de5b28187b80eb178c18d0e82b3cd7a3d',
    },
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const boot = JSON.parse(await readFile(path.join(root, 'boot.json'), 'utf8'));
  const { bytes, report } = await createArchive(root, boot);
  await mkdir(path.join(root, 'dist'), { recursive: true });
  await writeFile(path.join(root, 'dist/cheat-extended-r1.mod.zip'), bytes);
  await writeFile(path.join(root, 'dist/assembly.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(`${report.version}: ${report.members.length} ZIP members; ${report.patchResources.length} external Patch resources; SHA256 ${report.sha256}`);
}
