/**
 * Build the plugin's `lib/` directly into the repo root, and optionally pack
 * a `.tgz` alongside it. The repo root IS the installable package, so there's
 * no separate stage: `tsdown` and `tsc` run with `cwd = root`, write into
 * `root/lib/`, and `pnpm pack` uses the root manifest.
 *
 * The root `package.json` is swapped from its Dev form (only `react` as peer)
 * to its Publish form (all 10 `@deepseek-ai/*` peers with exact ranges) so
 * both `dsh plugin add <local-dir>` and `pnpm pack` produce a correct plugin
 * manifest. The Dev form is backed up to `package.json.dev.bak`; restore it
 * with `pnpm run restore-dev` or `git checkout -- package.json`.
 *
 *   node pack.mjs               -> build lib/ + dsh-token-tracker-<version>.tgz
 *   node pack.mjs --skip-pack   -> build lib/ only
 */
import { copyFileSync, existsSync, rmSync, writeFileSync, readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { join, resolve } from 'node:path'

const skipPack = process.argv.includes('--skip-pack')

const root = resolve(import.meta.dirname)
const publish = join(root, 'publish')
const rootManifestPath = join(root, 'package.json')
const rootManifestBak = join(root, 'package.json.dev.bak')

// Local build binaries (node_modules/.bin/tsdown, .../tsc) are invoked DIRECTLY
// by absolute path. On Windows the `.CMD` shims must run through a shell.
const binDir = join(root, 'node_modules', '.bin')
const binName = (name) => (process.platform === 'win32' ? `${name}.CMD` : name)
const runBin = (name, args, opts = {}) => {
  const result = spawnSync(
    join(binDir, binName(name)),
    args,
    { stdio: 'inherit', cwd: root, shell: process.platform === 'win32', ...opts },
  )
  if (result.error !== undefined) throw result.error
  if (result.status !== 0) throw new Error(`${name} ${args.join(' ')} failed with ${result.status}`)
  return result
}
const pnpmCmd = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'
const runPnpm = (args, opts = {}) => {
  const result = spawnSync(
    pnpmCmd,
    args,
    { stdio: 'inherit', cwd: root, shell: process.platform === 'win32', ...opts },
  )
  if (result.error !== undefined) throw result.error
  if (result.status !== 0) throw new Error(`pnpm ${args.join(' ')} failed with ${result.status}`)
  return result
}

// 1. Clean the previous lib/ (tsdown's host config also has clean:true, but
//    wipe explicitly so a failed prior run can't leave stale output).
rmSync(join(root, 'lib'), { recursive: true, force: true })

// 2. Host + browser bundles. tsdown's entry paths (`src/...`) and `tsconfig`
//    resolve relative to cwd (root), and outDir `lib` writes to root/lib/.
try {
  runBin('tsdown', ['--config', join(publish, 'tsdown.config.ts')])
} catch (error) {
  console.error('build failed', error)
  process.exit(1)
}

// 3. Type declarations: emit `lib/types` straight from `src/` with the
//    self-contained tsconfig (no harness; @deepseek-ai/* resolves to types.stub/).
try {
  runBin('tsc', ['-p', 'tsconfig.json'])
} catch (error) {
  console.error('type declaration build failed', error)
  process.exit(1)
}
if (!existsSync(join(root, 'lib', 'types'))) {
  console.error('type declarations were not produced at lib/types')
  process.exit(1)
}

// 4. Sync the bundle-layer patch to the repo root (referenced by dsh.bundle.patch).
copyFileSync(join(publish, 'cordis.patch.yml'), join(root, 'cordis.patch.yml'))

// 5. Swap the root manifest to Publish form: inject the exact @deepseek-ai/*
//    peer ranges from publish/package.json. Back up the Dev form first.
if (!existsSync(rootManifestBak)) {
  copyFileSync(rootManifestPath, rootManifestBak)
}
const publishManifest = JSON.parse(readFileSync(join(publish, 'package.json'), 'utf8'))
const devManifest = JSON.parse(readFileSync(rootManifestBak, 'utf8'))
const publishForm = {
  ...devManifest,
  peerDependencies: { ...publishManifest.peerDependencies },
}
writeFileSync(rootManifestPath, JSON.stringify(publishForm, null, 2) + '\n')
console.log('root package.json -> Publish form (peer deps injected); dev backup at package.json.dev.bak')

// 6. Optional: pack a .tgz using the now-Publish root manifest.
if (skipPack) {
  console.log('\n--skip-pack: lib/ built and root manifest is Publish; tarball skipped.')
} else {
  console.log(`\npacking tarball into ${root} ...`)
  try {
    runPnpm(['pack', '--pack-destination', root])
  } catch (error) {
    console.error('pack failed', error)
    process.exit(1)
  }
}
