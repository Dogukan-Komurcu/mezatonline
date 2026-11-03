import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFile, lstat, mkdir, mkdtemp, readFile, realpath, rm, rmdir, symlink, writeFile, chmod } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const shaPattern = /^[a-f0-9]{40}$/;
const preserved = new Set(['.git', '.openai', 'node_modules', 'dist', 'work', 'source-provenance.json', 'Mezatonline-Ac.html']);
const gitEnv = { ...process.env, GIT_TERMINAL_PROMPT: '0' };
for (const key of ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_COMMON_DIR']) delete gitEnv[key];
const git = (cwd, args) => execFileSync('git', args, { cwd, env: gitEnv, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
const json = async (file) => JSON.parse(await readFile(file, 'utf8'));
const optional = async (file) => readFile(file, 'utf8').catch((error) => { if (error.code === 'ENOENT') return null; throw error; });
const stat = async (file) => lstat(file).catch((error) => { if (['ENOENT', 'ENOTDIR'].includes(error.code)) return null; throw error; });
const safePath = (file) => file && !path.posix.isAbsolute(file) && !/[\\\x00-\x1f\x7f]/.test(file) && file.split('/').every((part) => part && part !== '.' && part !== '..');
const appFile = (file) => !preserved.has(file.split('/')[0]);
const dependencies = (pkg) => JSON.stringify([pkg.dependencies, pkg.devDependencies, pkg.optionalDependencies, pkg.overrides, pkg.packageManager]);
const dependencyHash = (pkg, lock) => createHash('sha256').update(dependencies(pkg)).update(lock ?? '').digest('hex');

function sourceFiles(repositoryRoot, commit) {
  if (!shaPattern.test(commit)) throw new Error('Kaynak commit kimliği tam 40 haneli SHA olmalı.');
  return git(repositoryRoot, ['ls-tree', '-rz', commit]).split('\0').filter(Boolean).map((entry) => {
    const [header, file] = entry.split('\t');
    const mode = header.split(' ')[0];
    if (!safePath(file) || !['100644', '100755'].includes(mode)) throw new Error(`Güvenli olmayan kaynak dosyası: ${file}`);
    return { file, mode };
  }).filter(({ file }) => appFile(file));
}

async function safeDestination(checkout, file) {
  if (!safePath(file) || !appFile(file)) throw new Error(`Korunan veya geçersiz hedef: ${file}`);
  let current = checkout;
  for (const part of file.split('/')) {
    current = path.join(current, part);
    if ((await stat(current))?.isSymbolicLink()) throw new Error(`Hedefte sembolik bağlantı var: ${file}`);
  }
}

export async function checkPreview(repositoryRoot, config) {
  git(repositoryRoot, ['fetch', '--no-tags', 'origin', config.branch]);
  const sourceCommit = git(repositoryRoot, ['rev-parse', `refs/remotes/origin/${config.branch}^{commit}`]).trim();
  const versionUrl = new URL('/version.json', config.url);
  versionUrl.searchParams.set('check', String(Date.now()));
  const response = await fetch(versionUrl, { cache: 'no-store', signal: AbortSignal.timeout(20_000) });
  if (!response.ok && response.status !== 404) throw new Error(`Canlı sürüm okunamadı: HTTP ${response.status}`);
  // The first static publication falls back to index.html for an absent marker.
  const body = response.status === 404 ? '' : await response.text();
  const publishedCommit = !body || /^\s*(?:<!doctype html|<html)/i.test(body) ? null : JSON.parse(body).sourceCommit;
  if (publishedCommit !== null && !shaPattern.test(publishedCommit)) throw new Error('Canlı version.json geçerli bir sourceCommit içermiyor.');
  return { needsPublish: sourceCommit !== publishedCommit, sourceCommit, publishedCommit };
}

async function selectedCheckout(repositoryRoot, config) {
  if (!safePath(config.checkout)) throw new Error('Site kaynak kopyası proje içinde göreli bir yol olmalı.');
  const checkout = await realpath(path.resolve(repositoryRoot, config.checkout));
  const repositoryPath = await realpath(repositoryRoot);
  if (!checkout.startsWith(`${repositoryPath}${path.sep}`)) throw new Error('Site kaynak kopyası proje klasörünün dışında.');
  if (await realpath(git(checkout, ['rev-parse', '--show-toplevel']).trim()) !== checkout) throw new Error('Site kendi Git deposunda olmalı.');
  if ((await json(path.join(checkout, '.openai/hosting.json'))).project_id !== config.project_id) throw new Error('Site proje kimliği eşleşmiyor.');
  return checkout;
}

async function installedMarker(checkout) {
  const file = path.join(checkout, 'work/preview-site-installed.json');
  if ((await stat(path.dirname(file)))?.isSymbolicLink() || (await stat(file))?.isSymbolicLink()) throw new Error('Kurulum işareti yolu sembolik bağlantı olamaz.');
  return file;
}

export async function markInstalled(repositoryRoot, config) {
  const checkout = await selectedCheckout(repositoryRoot, config);
  const modules = await stat(path.join(checkout, 'node_modules'));
  if (!modules?.isDirectory() || modules.isSymbolicLink()) throw new Error('Önce Site kaynak kopyasının kendi node_modules klasörüne başarılı kurulum yapın.');
  const hash = dependencyHash(await json(path.join(checkout, 'package.json')), await optional(path.join(checkout, 'package-lock.json')));
  const marker = await installedMarker(checkout);
  await mkdir(path.dirname(marker), { recursive: true });
  await writeFile(marker, `${JSON.stringify({ dependencyHash: hash })}\n`);
  return { checkout, dependenciesInstalled: true };
}

export async function syncSnapshot(repositoryRoot, config, commit) {
  if (!shaPattern.test(commit)) throw new Error('Kaynak commit kimliği tam 40 haneli SHA olmalı.');
  git(repositoryRoot, ['merge-base', '--is-ancestor', commit, `refs/remotes/origin/${config.branch}`]);
  const checkout = await selectedCheckout(repositoryRoot, config);
  const repositoryPath = await realpath(repositoryRoot);
  const provenancePath = path.join(checkout, 'source-provenance.json');
  if ((await stat(provenancePath))?.isSymbolicLink()) throw new Error('Kaynak provenance dosyası sembolik bağlantı olamaz.');
  const previous = await json(provenancePath);
  if (previous.repository !== config.repository) throw new Error('Önceki kaynak deposu eşleşmiyor.');
  const files = sourceFiles(repositoryRoot, commit);
  const current = new Set(files.map(({ file }) => file));
  const removed = sourceFiles(repositoryRoot, previous.commit).map(({ file }) => file).filter((file) => !current.has(file));
  for (const file of [...current, ...removed]) await safeDestination(checkout, file);
  const oldLock = await optional(path.join(checkout, 'package-lock.json'));
  const oldPackage = await json(path.join(checkout, 'package.json'));
  const temporary = await mkdtemp(path.join(os.tmpdir(), 'mezatonline-site-'));
  try {
    const archive = path.join(temporary, 'snapshot.tar');
    const snapshot = path.join(temporary, 'source');
    await mkdir(snapshot);
    git(repositoryRoot, ['archive', '--format=tar', `--output=${archive}`, commit]);
    execFileSync('tar', ['-xf', archive, '-C', snapshot]);
    for (const { file } of files) if (!(await stat(path.join(snapshot, file)))?.isFile()) throw new Error(`Arşivde kaynak dosyası yok: ${file}`);
    const nextPackage = await json(path.join(snapshot, 'package.json'));
    const nextLock = await optional(path.join(snapshot, 'package-lock.json'));
    const dependenciesChanged = oldLock !== nextLock || dependencies(oldPackage) !== dependencies(nextPackage);
    const modules = path.join(checkout, 'node_modules');
    const modulesBefore = await stat(modules);
    const linkedToRoot = modulesBefore?.isSymbolicLink() ?? false;
    const marker = await installedMarker(checkout);
    const installed = await optional(marker);
    const needsInstall = dependenciesChanged || !modulesBefore?.isDirectory() || linkedToRoot || !installed || JSON.parse(installed).dependencyHash !== dependencyHash(nextPackage, nextLock);
    if (needsInstall) await rm(marker, { force: true });
    for (const file of removed) {
      await rm(path.join(checkout, file), { force: true });
      for (let directory = path.posix.dirname(file); directory !== '.'; directory = path.posix.dirname(directory)) {
        try { await rmdir(path.join(checkout, directory)); }
        catch (error) { if (['ENOTEMPTY', 'EEXIST'].includes(error.code)) break; if (error.code !== 'ENOENT') throw error; }
      }
    }
    for (const { file, mode } of files) {
      const destination = path.join(checkout, file);
      await mkdir(path.dirname(destination), { recursive: true });
      if ((await stat(destination))?.isDirectory()) await rmdir(destination);
      await copyFile(path.join(snapshot, file), destination);
      await chmod(destination, mode === '100755' ? 0o755 : 0o644);
    }
    nextPackage.scripts = { ...nextPackage.scripts, build: 'node scripts/build-hosted-preview.mjs' };
    await writeFile(path.join(checkout, 'package.json'), `${JSON.stringify(nextPackage, null, 2)}\n`);
    await writeFile(path.join(checkout, 'source-provenance.json'), `${JSON.stringify({ repository: config.repository, commit }, null, 2)}\n`);
    let nodeModulesLinked = linkedToRoot;
    if (!modulesBefore && await stat(path.join(repositoryRoot, 'node_modules'))) {
      await symlink(path.join(repositoryPath, 'node_modules'), modules, 'dir');
      nodeModulesLinked = true;
    }
    return { checkout, sourceCommit: commit, needsInstall, dependenciesChanged, nodeModulesLinked };
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const config = await json(path.join(root, 'scripts/preview-site.json'));
    const [mode, commit, ...extra] = process.argv.slice(2);
    if (extra.length || (mode === '--sync' ? !commit : !['--check', '--mark-installed'].includes(mode) || commit)) throw new Error('Kullanım: node scripts/sync-preview-site.mjs --check | --sync <40-haneli-SHA> | --mark-installed');
    console.log(JSON.stringify(mode === '--check' ? await checkPreview(root, config) : mode === '--mark-installed' ? await markInstalled(root, config) : await syncSnapshot(root, config, commit)));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
