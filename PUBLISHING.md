# Publishing & packaging notes

> **[简体中文](PUBLISHING.zh-CN.md)** · Read this page in **English**

This repo is the **standalone, distributable source** for the `dsh-token-tracker`
plugin. It is self-contained: `node pack.mjs` stages the package and builds it
(`src/` → `lib/`) with only this repo's devDependencies (`typescript`, `tsdown`,
`@types/react`, `@types/node`), producing an installable
`dsh-token-tracker-<version>.tgz` with no harness checkout required.

- **How to distribute a release** → see [RELEASING.md](RELEASING.md) (git tag +
  GitHub Release asset, or optional npm).
- **How end users install it** → see [README.md](README.md#installing-the-plugin-two-step)
  (the two-step harness-first install).
- **How the package is structured** → `publish/` holds the shipped manifest
  (`publish/package.json`), the bundle patch layer
  (`publish/cordis.patch.yml`), and the self-contained build
  (`publish/tsdown.config.ts`). `types.stub/` provides build-time ambient types
  for the `@deepseek-ai/*` peer packages so declaration generation never needs
  to pull them; the shipped `.d.ts` still reference the real peer package names.

## Why `@deepseek-ai/dsh-*` stay as peers

`publish/package.json` keeps the harness packages in `peerDependencies` (not
`dependencies`):

- End users already have the matching `@deepseek-ai/dsh-*` installed in their
  local tree because the DSH install flow requires installing the harness first.
- Listing them as `dependencies` would make installers try to resolve them from
  the npm registry and can fail if the versions aren't published or don't match.

Both manifest keys are required for the browser + layer behavior:

- `dsh.bundle` → `cordis.patch.yml` → lets `dsh plugin add` activate a layer
  (inserts the `token-tracker` row).
- `dsh.client` (`platform: web`) → the browser half is auto-discovered and
  served by the web composition.

## Verification before a release

```sh
node pack.mjs
tar -tzf dsh-token-tracker-<version>.tgz    # contains lib/ + cordis.patch.yml + LICENSE
# then, in a harness install:
dsh plugin --profile web add ./dsh-token-tracker-<version>.tgz
dsh --profile web --dump-config            # token-tracker layer
dsh --profile web                          # check /dsh-token-tracker + /dsh-token-tracker/api
```
