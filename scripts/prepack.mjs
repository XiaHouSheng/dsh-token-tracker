/**
 * Runs right before `pnpm pack` (e.g. during a git-URL install:
 *   pnpm add https://github.com/XiaHouSheng/dsh-token-tracker.git
 * which clones the repo then runs `pnpm pack` internally).
 *
 * The checked-in root `package.json` is the **dev manifest**: it omits the
 * harness-only `@deepseek-ai/*` peer dependencies so `pnpm install` at the
 * plugin dev repo works (those versions aren't published to the public npm
 * registry). But the distributed package — either packed tarball or a git-URL
 * install — MUST declare those peers so dsh's pnpm layout symlinks them into
 * the plugin's `node_modules/.pnpm/` sandbox.
 *
 * This script:
 *   1. Saves a backup of the dev manifest as `package.json.dev.bak`.
 *   2. Produces a merged publish manifest at `package.json`:
 *        - `peerDependencies`  = publish/package.json peer deps (the harness ones)
 *        - other top-level keys (name/version/dsh/main/exports/files/...) = kept
 *        - `devDependencies`    = kept (pnpm pack filters them out anyway)
 */
import { copyFileSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const devManifestPath = join(root, 'package.json')
const backupPath = join(root, 'package.json.dev.bak')
const publishManifestPath = join(root, 'publish', 'package.json')

const devManifest = JSON.parse(readFileSync(devManifestPath, 'utf8'))
const publishManifest = JSON.parse(readFileSync(publishManifestPath, 'utf8'))

copyFileSync(devManifestPath, backupPath)

const merged = {
  ...devManifest,
  peerDependencies: { ...publishManifest.peerDependencies },
}

writeFileSync(devManifestPath, JSON.stringify(merged, null, 2) + '\n')
console.log('[prepack] injected harness peer deps; backup saved to package.json.dev.bak')
