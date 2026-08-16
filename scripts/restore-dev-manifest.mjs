/**
 * Explicit user helper: restore the dev manifest from backup (if any) or
 * re-checkout `package.json` via git. Useful after `npm run build` (which
 * intentionally replaces the root manifest with the publish form for
 * `dsh plugin add ./local-path` convenience).
 *
 *   npm run restore-dev
 */
import { existsSync, renameSync, unlinkSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { join, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const backupPath = join(root, 'package.json.dev.bak')
const manifestPath = join(root, 'package.json')

if (existsSync(backupPath)) {
  renameSync(backupPath, manifestPath)
  console.log('Restored dev manifest from backup.')
} else {
  // No backup? Try git checkout.
  const result = spawnSync(
    (process.platform === 'win32' ? 'git.cmd' : 'git'),
    ['checkout', '--', 'package.json'],
    { stdio: 'inherit', cwd: root, shell: process.platform === 'win32' },
  )
  if (result.status !== 0) {
    console.warn(
      'Could not auto-restore package.json. Run `git checkout -- package.json` manually, '
      + 'or re-apply the dev-only peerDependencies list (see package.json~restore example).',
    )
  }
}

try { if (existsSync(backupPath)) unlinkSync(backupPath) } catch (_) { /* noop */ }
