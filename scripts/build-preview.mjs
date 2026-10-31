import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const destination = path.join(root, 'work/share-web');
const commands = [
  [path.join(root, 'node_modules/expo/bin/cli'), 'export', '--platform', 'web', '--output-dir', destination, '--clear', '--max-workers', '4'],
  [path.join(root, 'scripts/package-preview.mjs'), destination, path.join(root, 'Mezatonline-Ac.html')],
];
for (const args of commands) {
  const result = spawnSync(process.execPath, args, {
    cwd: root,
    env: { ...process.env, EXPO_PUBLIC_SHARE_PREVIEW: '1', EXPO_NO_BUNDLE_SPLITTING: '1', CI: '1' },
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
