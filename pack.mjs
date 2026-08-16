/**
 * Stage + pack a standalone, self-contained tarball for dsh-token-tracker.
 *
 * The resulting `.tgz` is installed by end users with
 *   dsh plugin --profile <name> add ./dsh-token-tracker-<version>.tgz
 * It ships `dsh.bundle` (activates a layer via `cordis.patch.yml`) and
 * `dsh.client` (the browser half is auto-discovered and served), plus a
 * prebuilt `lib/` (host + browser + type declarations) so no install-time
 * build or build-script permission is required.
 *
 * This script is fully self-contained: it needs only this repo checked out
 * (with `pnpm install` run once at the root so `typescript`/`tsdown` are
 * available) and touches no harness checkout.
 *
 *   Type declarations  -> `tsc -p tsconfig.json` emits `lib/types` from `src/`
 *                         (the repo-local tsconfig is self-contained: it
 *                         resolves `@deepseek-ai/*` to ambient stubs under
 *                         `types.stub/`, so no peer package has to be pulled).
 *   Host/Web bundles   -> `tsdown -c publish/tsdown.config.ts` (self-contained
 *                         config, with TS decorator lowering for `@Remote`).
 *   Pack               -> `pnpm pack` inside the stage.
 *
 * Usage:  node pack.mjs   -> dsh-token-tracker-<version>.tgz  (at repo root)
 */
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { join, resolve } from 'node:path'

const root = resolve(import.meta.dirname)
const stage = join(root, 'standalone')
const publish = join(root, 'publish')

// Clean, then recreate the (git-ignored) build stage and the root type output.
rmSync(stage, { recursive: true, force: true })
rmSync(join(root, 'lib'), { recursive: true, force: true })
mkdirSync(stage, { recursive: true })

// 1. Sources + self-contained build config + manifest + patch layer.
cpSync(join(root, 'src'), join(stage, 'src'), { recursive: true })
cpSync(join(publish, 'tsdown.config.ts'), join(stage, 'tsdown.config.ts'))
cpSync(join(root, 'tsconfig.json'), join(stage, 'tsconfig.json'))
cpSync(join(publish, 'cordis.patch.yml'), join(stage, 'cordis.patch.yml'))
if (existsSync(join(root, 'LICENSE'))) cpSync(join(root, 'LICENSE'), join(stage, 'LICENSE'))

// Standalone manifest (name/version/deps are parameterized by author edits to
// publish/package.json). `repository`/`homepage` in publish/package.json are
// used as-is; set them to the real GitHub URL before your first release.
const manifest = JSON.parse(readFileSync(join(publish, 'package.json'), 'utf8'))
writeFileSync(join(stage, 'package.json'), JSON.stringify(manifest, null, 2) + '\n')

// 2. Build host + browser bundles from the stage so `outDir` stays isolated.
//    Run tsdown from the repo root's installed binary with the stage as cwd:
//    entry paths (`src/...`) and `tsconfig` then resolve next to the staged
//    config, and Node module resolution walks up from the stage to the root's
//    node_modules for `typescript` (used by the decorator-lowering plugin).
//
//    The local build binaries (node_modules/.bin/tsdown, .../tsc) are invoked
//    DIRECTLY by absolute path rather than through `pnpm exec`. The stage has no
//    node_modules of its own, so `pnpm exec <bin>` from inside the stage cannot
//    reliably resolve the command; the root install (done once via `pnpm
//    install`) is the guaranteed source of these tools. `pnpm` itself is global
//    (not a devDependency) and is resolved through PATH for the pack step.
const binDir = join(root, 'node_modules', '.bin')
const binName = (name) => (process.platform === 'win32' ? `${name}.CMD` : name)
const runBin = (name, args, opts = {}) => {
  // stdio: 'inherit' only — capturing stdin/stdout through a pipe is denied by
  // some sandboxed runners, and inheritance needs no shell redirection. cwd
  // defaults to the repo root; pass { cwd } to any subdir. On Windows the
  // `.CMD` shims must run through a shell (Node cannot spawn them directly).
  const result = spawnSync(
    join(binDir, binName(name)),
    args,
    { stdio: 'inherit', cwd: root, shell: process.platform === 'win32', ...opts },
  )
  if (result.error !== undefined) throw result.error
  if (result.status !== 0) throw new Error(`${name} ${args.join(' ')} failed with ${result.status}`)
  return result
}
// pnpm itself is a global tool (not a devDependency), so it lives on PATH, not
// in node_modules/.bin. Resolve it through PATH with the platform suffix.
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
try {
  // Host (`lib/index.js` + `lib/invariant.js`) then build client (`lib/client.js`).
  runBin('tsdown', ['--config', 'tsdown.config.ts'], { cwd: stage })
} catch (error) {
  console.error('build failed', error)
  process.exit(1)
}

// 3. Type declarations: emit `lib/types` straight from `src/` with this repo's
//    self-contained tsconfig (no harness), then copy them into the stage after
//    the tsdown host build (whose `clean: true` would otherwise wipe them).
try {
  // `tsc` resolves tooling and the `@deepseek-ai/*` type stubs from this repo.
  runBin('tsc', ['-p', 'tsconfig.json'], { cwd: root })
} catch (error) {
  console.error('type declaration build failed', error)
  process.exit(1)
}
if (existsSync(join(root, 'lib', 'types'))) {
  cpSync(join(root, 'lib', 'types'), join(stage, 'lib', 'types'), { recursive: true })
} else {
  console.error('type declarations were not produced at lib/types')
  process.exit(1)
}

// 4. Pack the stage. pnpm prints the generated tarball path to stdout.
console.log(`\npacking standalone tarball into ${root} ...`)
try {
  runPnpm(['pack', '--pack-destination', root], { cwd: stage })
} catch (error) {
  console.error('pack failed', error)
  process.exit(1)
}
