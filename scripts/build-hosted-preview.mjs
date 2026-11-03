import { spawnSync, execFileSync } from 'node:child_process';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const result = spawnSync(process.execPath, [path.join(root, 'scripts/build-preview.mjs')], {
  cwd: root,
  stdio: 'inherit',
});
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);

let provenance;
try {
  provenance = JSON.parse(await readFile(path.join(root, 'source-provenance.json'), 'utf8'));
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
  provenance = { commit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim() };
}
if (!/^[a-f0-9]{40}$/.test(provenance.commit)) throw new Error('Geçerli kaynak commit kimliği bulunamadı.');
const dist = path.join(root, 'dist');
await mkdir(dist, { recursive: true });
await copyFile(path.join(root, 'Mezatonline-Ac.html'), path.join(dist, 'index.html'));
await writeFile(path.join(dist, 'robots.txt'), 'User-agent: *\nDisallow: /\n');
await writeFile(path.join(dist, 'version.json'), `${JSON.stringify({ sourceCommit: provenance.commit, builtAt: new Date().toISOString() }, null, 2)}\n`);
