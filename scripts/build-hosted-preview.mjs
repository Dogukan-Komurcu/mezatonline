import { spawnSync, execFileSync } from 'node:child_process';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
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
const builtAt = new Date().toISOString();
let html = await readFile(path.join(root, 'Mezatonline-Ac.html'), 'utf8');
// The Site checkout has its own Git history. Compare the app's GitHub commit
// with version.json, rather than the Site repository's packaging commit.
const commitMeta = /<meta name="mezatonline-source-commit" content="[^"]*">/;
const builtMeta = /<meta name="mezatonline-built-at" content="[^"]*">/;
if (!commitMeta.test(html) || !builtMeta.test(html) || !html.includes('</body>')) {
  throw new Error('Önizleme HTML dosyasında sürüm bilgisi veya body etiketi eksik.');
}
html = html.replace(commitMeta, `<meta name="mezatonline-source-commit" content="${provenance.commit}">`)
  .replace(builtMeta, `<meta name="mezatonline-built-at" content="${builtAt}">`);
const versionCheck = (await readFile(path.join(root, 'scripts/preview/check-version.js'), 'utf8'))
  .replace(/<\/script/gi, '<\\/script');
html = html.replace('</body>', `<script id="mezatonline-version-check">\n${versionCheck}\n</script></body>`);
await writeFile(path.join(dist, 'index.html'), html);
await writeFile(path.join(dist, 'robots.txt'), 'User-agent: *\nDisallow: /\n');
await writeFile(path.join(dist, 'version.json'), `${JSON.stringify({ sourceCommit: provenance.commit, builtAt }, null, 2)}\n`);
// Sites supplies max-age=0, must-revalidate for these static responses and does
// not apply Cloudflare _headers files. The version checker bypasses browser
// caching explicitly; remove an older generated header file on incremental builds.
await rm(path.join(dist, '_headers'), { force: true });
