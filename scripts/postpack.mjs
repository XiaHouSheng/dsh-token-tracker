/**
 * Runs right after `pnpm pack`. Restores the dev manifest that
 * `scripts/prepack.mjs` swapped out, and removes the backup file.
 *
 * Safe to run idempotently (e.g. if `prepack` never ran because the user is
 * packing the stage directory, this is a no-op).
 */
import { existsSync, renameSync, unlinkSync } from 'node:fs'
import { join, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const backupPath = join(root, 'package.json.dev.bak')
const manifestPath = join(root, 'package.json')

if (existsSync(backupPath)) {
  renameSync(backupPath, manifestPath)
  console.log('[postpack] restored dev manifest from package.json.dev.bak')
} else {
  console.log('[postpack] no backup (package.json.dev.bak) found, nothing to restore')
}

// Clean up any stale backup even if rename missed it (edge cases).
try { if (existsSync(backupPath)) unlinkSync(backupPath) } catch (_) { /* noop */ }
