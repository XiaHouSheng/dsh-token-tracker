# Releasing dsh-token-tracker (GitHub Release)

> **[简体中文](RELEASING.zh-CN.md)** · Read this page in **English**

This plugin is distributed as a **self-contained installable tarball** attached
to a GitHub Release. End users download `dsh-token-tracker-<version>.tgz` and
run `dsh plugin add` (see [README](README.md#installing-the-plugin-two-step)).

> This is the standalone distribution path. It does **not** require publishing to
> npm. If you later want npm, see [Publishing to npm](#publishing-to-npm-optional).

## Before the first release

1. Point `publish/package.json` at your real repository:
   - `repository.url`, `homepage`, `bugs.url`
2. Keep `publish/package.json`'s `version` as your release version.
3. Keep the `peerDependencies` `@deepseek-ai/dsh-*` ranges in step with the
   harness edition you target. They are satisfied by a harness install, and are
   deliberately **not** `dependencies` (see README, "Installing the plugin").

## Release checklist

```sh
# 1. Bump the version (edit publish/package.json "version", e.g. 0.2.0).
#    Also bump the root package.json "version" and tsconfig stay in sync if you like.

# 2. Build the self-contained tarball from a clean checkout.
cd dsh-token-tracker
pnpm install          # installs only build tooling (typescript, tsdown, react types)
node pack.mjs         # -> dsh-token-tracker-<version>.tgz

# 3. Sanity-check the tarball (contents + that lib/types were generated from src).
tar -tzf dsh-token-tracker-<version>.tgz
```

Then, from the **harness** machine you distribute against, do a real install
check:

```sh
# harness already cloned + `pnpm install`ed (Step 1 of the install guide)
dsh plugin --profile web add ./dsh-token-tracker-<version>.tgz
dsh --profile web --dump-config      # token-tracker layer present
dsh --profile web                     # boot; check /dsh-token-tracker + /api
```

Proceed to GitHub.

## Automated releases (GitHub Actions)

A workflow is included at [`.github/workflows/release.yml`](.github/workflows/release.yml).
It builds the same tarball from a clean checkout and attaches it to a GitHub
Release automatically, so you only need to push a tag:

```sh
# bump publish/package.json "version" first (e.g. 0.2.0) and commit it
git commit -am "release: dsh-token-tracker 0.2.0"
git tag v0.2.0
git push origin main --tags        # the Action builds + creates the Release
```

The Action:

- installs Node 22 + pnpm 11, runs `pnpm install --frozen-lockfile`,
- runs `node pack.mjs` to produce `dsh-token-tracker-<version>.tgz` (version
  read from `publish/package.json`), and
- uses `softprops/action-gh-release` to create the Release and upload the
  tarball (requires `contents: write`; the repo's `GITHUB_TOKEN` is enough).

It can also be run manually from the Actions tab (`workflow_dispatch`).
Requires a committed `pnpm-lock.yaml` (present in this repo) for the install.

Releases created by the **manual** path below are equivalent; pick whichever
suits you.

## Publishing steps (git + GitHub Release)

### Fully manual path (no Action)

```sh
# 4. Commit the version bump + build config.
git add publish/package.json RELEASING.md README.md
git commit -m "release: dsh-token-tracker <version>"

# 5. Tag the release. Pin the tarball name to the exact version.
git tag -a v<version> -m "dsh-token-tracker <version>"
git push origin main --tags

# 6. Create the Release and attach the tarball — GitHub UI, or gh CLI:
gh release create v<version> \
    --title "dsh-token-tracker <version>" \
    --notes "See the README for install steps. Peer deps are satisfied by installing the harness first, then: \`dsh plugin --profile web add ./dsh-token-tracker-<version>.tgz\`." \
    dsh-token-tracker-<version>.tgz

# 7. Update the README link to the new tarball if it referenced an old version.
```

> If the repo has the `release.yml` Action enabled, step 6 (creating the
> Release) is done for you by the Action when you push the tag — you can skip
> the `gh release create` call.

The README's install section and the Release body must both state the
**two-step** flow:

1. `git clone` + `pnpm install` the harness (this installs the `@deepseek-ai/*`
   peers into the local tree).
2. `dsh plugin --profile web add ./dsh-token-tracker-<version>.tgz`.

## Publishing to npm (optional, later)

If you prefer an installable npm package (a personal scope is not restrictive,
unlike the reserved `@deepseek-ai` scope):

1. **Rename the package** to a scope you own in `publish/package.json`
   (e.g. `@<your-name>/dsh-token-tracker`) **and** in the module id used by the
   tarball's manifest (the `"name"`), the `cordis.patch.yml` row `name`, the
   client bundle `ID` in `publish/tsdown.config.ts`, and the browser loader id.
   Keep `dsh.bundle` + `dsh.client`.
2. Keep `@deepseek-ai/dsh-*` as **peers** (never `dependencies`) so npm doesn't
   try to resolve them from the registry.
3. Publish:

```sh
npm login
node pack.mjs            # optional: build once to confirm
pnpm --dir publish publish --publish-branch main
# or, if you publish the repo root directly, add root scripts.
```

End users then install with:

```sh
dsh plugin --profile web add @<your-name>/dsh-token-tracker
```

## Troubleshooting / common pitfalls

- **`dsh plugin add` warns about unsatisfied peers** → the harness wasn't
  installed into the profile's local tree first, or the peer ranges don't match
  the installed harness edition. Do Step 1 (install the harness) before Step 2.
- **The GUI badge/Tab is missing but the layer is present** → the browser half
  wasn't served. Confirm the tarball manifests `dsh.client` (`platform: web`)
  **and** `dsh.bundle` (`patch: ./cordis.patch.yml`); both are required.
- **`node pack.mjs` fails because `typescript`/`tsdown` are missing** → run
  `pnpm install` at the repo root first (the repo's devDependencies are the only
  packages the build needs; `@deepseek-ai/*` peers are never fetched during
  build — they resolve to the stubs under `types.stub/`).
