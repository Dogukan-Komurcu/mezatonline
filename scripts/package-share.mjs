#!/usr/bin/env node
/** Package the committed source and matching portable preview for a GitHub Release. */
import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rename, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const help = `Kullanım: node scripts/package-share.mjs [--html DOSYA] [--output DOSYA.zip]

Varsayılan HTML: Mezatonline-Ac.html
Varsayılan çıktı: work/share-package/DogukanMezatonline.zip

Önce değişiklikleri commit edin ve npm run preview:build çalıştırın.
Paket, HEAD kaynaklarını Kodlar/ içine ve aynı commit'in HTML önizlemesini
DogukanMezatonline/Mezatonline-Ac.html yoluna koyar. Git ve Python 3 gerekir.
Üretilen ZIP GitHub Release eki olarak paylaşılır; Git'e commit edilmez.`;

function git(args) {
  return execFileSync('git', args, { cwd: project, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
}

async function main() {
  let preview = path.join(project, 'Mezatonline-Ac.html');
  let output = path.join(project, 'work/share-package/DogukanMezatonline.zip');
  const args = process.argv.slice(2);
  for (let index = 0; index < args.length; index++) {
    const argument = args[index];
    if (argument === '--help' || argument === '-h') {
      console.log(help);
      return;
    }
    if (!['--html', '--output'].includes(argument) || !args[index + 1] || args[index + 1].startsWith('--')) {
      throw new Error(`Geçersiz parametre: ${argument}. Yardım için --help kullanın.`);
    }
    const value = path.resolve(args[++index]);
    if (argument === '--html') preview = value;
    else output = value;
  }
  if (!output.toLowerCase().endsWith('.zip')) throw new Error('Çıktı dosyasının uzantısı .zip olmalı.');

  if (git(['status', '--porcelain', '--untracked-files=no']).trim()) {
    throw new Error('Önce takip edilen dosyalardaki değişiklikleri commit edin. Paket yalnızca HEAD kaynaklarını içerir.');
  }
  git(['cat-file', '-e', 'HEAD:scripts/package-share.mjs']);
  const commit = git(['rev-parse', 'HEAD']).trim();
  const html = await readFile(preview, 'utf8');
  const previewCommit = /<meta\s+name="mezatonline-source-commit"\s+content="([a-f0-9]{40})"\s*\/?\s*>/i.exec(html)?.[1];
  if (previewCommit !== commit) {
    throw new Error('HTML önizlemesi HEAD ile eşleşmiyor. npm run preview:build çalıştırıp yeniden deneyin.');
  }

  // Archive tracked source only. Reject entries that must never enter a shared source package.
  const entries = git(['ls-tree', '-r', '-z', 'HEAD']).split('\0').filter(Boolean);
  for (const entry of entries) {
    const [metadata, name] = entry.split('\t');
    const mode = metadata.split(' ')[0];
    if (!['100644', '100755'].includes(mode)) {
      throw new Error(`Paket gerçek dosyalar içermeli; kısayol veya alt modül bulundu: ${name}`);
    }
    if (/(^|\/)(?:\.git|node_modules|work|dist|web-build|ios|android|\.DS_Store|\.env[^/]*)(?:\/|$)/i.test(name)
      || /\.(?:p8|pem|key|p12|mobileprovision|jks|keystore|apk|ipa|xcarchive|zip|html)$/i.test(name)) {
      throw new Error(`Paylaşım paketine alınmaması gereken takip edilen dosya: ${name}`);
    }
  }

  await mkdir(path.dirname(output), { recursive: true });
  const temporary = await mkdtemp(path.join(path.dirname(output), '.package-'));
  try {
    const archive = path.join(temporary, 'DogukanMezatonline.zip');
    git(['archive', '--format=zip', '--prefix=DogukanMezatonline/Kodlar/', `--output=${archive}`, commit]);
    execFileSync('python3', ['-c', `
import sys, zipfile
archive, preview, commit = sys.argv[1:]
with zipfile.ZipFile(archive, 'a', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as package:
    package.write(preview, 'DogukanMezatonline/Mezatonline-Ac.html')
    package.comment = ('source-commit: ' + commit).encode('ascii')
`, archive, preview, commit], { cwd: project, stdio: 'inherit' });
    await rename(archive, output);
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
  console.log(`Hazır: ${output}\nKaynak commit: ${commit}\nİçerik: DogukanMezatonline/Mezatonline-Ac.html + DogukanMezatonline/Kodlar/`);
}

main().catch((error) => {
  console.error(`Paylaşım paketi oluşturulamadı: ${error.message}`);
  process.exitCode = 1;
});
