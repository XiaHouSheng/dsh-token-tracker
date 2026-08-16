/**
 * Self-contained publish build for the standalone dsh-token-tracker bundle.
 *
 * Unlike the in-repo tsdown.config.ts (which imports the harness-internal
 * `clientBundle` preset), this config depends only on published npm packages
 * and builds straight from `src/` (no prior `tsc`, no project references, no
 * type check), so it works on a fresh git checkout or a tarball with no build
 * artifacts. It emits:
 *   - Host:  lib/index.js + lib/invariant.js  (node; @deepseek-ai/* and node:*
 *            stay external, resolved from the profile's installed deps)
 *   - Web:   lib/client.js                    (browser, __ModuleLoader__ handoff)
 */
import type { UserConfig } from 'tsdown'
import ts from 'typescript'

// Modules the browser loader shares into its frozen module table (source of
// truth: packages/client/web/src/platform.ts in the harness monorepo).
const PLATFORM_MODULES = [
  'react', 'react/jsx-runtime', 'react-dom', 'react-dom/client', '@deepseek-ai/cordis',
  '@deepseek-ai/dsh-client-ui-slots',
  '@deepseek-ai/dsh-client-web-react',
  '@deepseek-ai/dsh-client-ui-primitives',
  '@deepseek-ai/dsh-client-ui-attachment',
  '@deepseek-ai/dsh-client-schema-form',
]

// The browser half also reads the client-runtime store engine through the
// loader module table (the documented runtime-store exemption).
const RUNTIME_STORE_EXEMPTION = '@deepseek-ai/dsh-client-runtime/client'

const CLIENT_EXTERNALS = [...PLATFORM_MODULES, RUNTIME_STORE_EXEMPTION]

const ID = 'dsh-token-tracker'

// Stage-3 decorators (`@Remote`) are not standard JS. The harness lowers them
// through its typert tsdown plugin; this self-contained build transpiles them
// with TypeScript's transpileModule (dev-time only, no type check).
const DECORATOR_SYNTAX = /^\s*@[A-Za-z_$][\w$]*/m
const decoratorLowering = {
  name: 'dsh-token-tracker-decorator-lowering',
  transform(code: string, id: string) {
    if (!/\.[cm]?tsx?$/.test(id) || !DECORATOR_SYNTAX.test(code)) return
    const result = ts.transpileModule(code, {
      fileName: id,
      compilerOptions: {
        target: ts.ScriptTarget.ES2024,
        module: ts.ModuleKind.ESNext,
        sourceMap: true,
      },
    })
    return { code: result.outputText.replace(/\n?\/\/# sourceMappingURL=.*$/u, '\n'), map: result.sourceMapText }
  },
}

// Host node bundle: everything under @deepseek-ai/* and node builtins stay
// external so the profile's installed peer deps provide them at runtime.
const hostConfig: UserConfig = {
  name: ID,
  entry: ['src/index.ts', 'src/invariant.ts'],
  outDir: 'lib',
  format: ['esm'],
  platform: 'node',
  target: 'es2024',
  fixedExtension: false,
  dts: false,
  clean: true,
  // The standalone repo keeps a single self-contained tsconfig.json at its
  // root (copied into the build stage by pack.mjs). Point at it explicitly so
  // tsdown never walks up to a harness tsconfig. Verbose:false keeps the
  // bundle free of meaningless "verbatim" markers and matches no type-check
  // during the JS-only publish build.
  tsconfig: './tsconfig.json',
  external: (id: string) => id.startsWith('@deepseek-ai/') || id.startsWith('node:'),
  plugins: [decoratorLowering],
}

const clientConfig: UserConfig = {
  name: `${ID}/client`,
  entry: { client: 'src/client/index.ts' },
  outDir: 'lib',
  format: 'cjs',
  platform: 'browser',
  target: 'es2024',
  dts: false,
  sourcemap: true,
  clean: false,
  tsconfig: './tsconfig.json',
  external: CLIENT_EXTERNALS,
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV ?? 'production'),
    'import.meta.env.MODE': JSON.stringify(process.env.NODE_ENV ?? 'production'),
    'import.meta.env': JSON.stringify({ MODE: process.env.NODE_ENV ?? 'production' }),
  },
  noExternal: (id: string) => (CLIENT_EXTERNALS.includes(id) ? undefined : true),
  outputOptions: {
    entryFileNames: 'client.js',
    banner: `window.__ModuleLoader__.load({ id: ${JSON.stringify(ID)}, factory: (require) => {`,
    footer: 'return module.exports; } });',
    intro: 'var module = { exports: {} }; var exports = module.exports;',
  },
}

export default [hostConfig, clientConfig]
