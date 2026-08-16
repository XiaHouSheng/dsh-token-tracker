# dsh-token-tracker

> **[简体中文](README.zh-CN.md)** · Read this page in **English**

A **dsh** (DeepSeek-Harness) web plugin that folds provider token usage from the
durable session log, prices it with a peak/off-peak table, and surfaces totals in
the dsh web GUI — a header badge + period tag, a Tracker button, a composer dock
line, a closed-turn tail, an injected `conversation.view` **Token** tab — plus a
standalone overview page and a JSON API.

This repository is the **standalone, distributable source** for the plugin. It
contains no harness checkout. Running `node pack.mjs` produces a self-contained
installable tarball (`dsh-token-tracker-<version>.tgz`) that end users install
with `dsh plugin add`. Releases are distributed from this repo's GitHub Release
assets.

> This is not the in-repo `@deepseek-ai/dsh-token-tracker` package (which lives
> inside the harness monorepo and is built by the workspace). It is the same
> `src/`, wrapped for independent distribution.

## Screenshots

| Token badge & period tag in the GUI header | Conversation **Token** tab / dock line | Standalone overview page |
| --- | --- | --- |
| ![GUI header token badge & period tag](resources/pic1.png) | ![Conversation Token tab / dock line](resources/pic2.png) | ![Standalone overview page](resources/pic3.png) |

## What it does

The package has a Host half and a Browser half.

**Host half** (`TokenTrackerService`, mounted as a `webServer` service consumer):

- Listens to `session/event` and folds `assistant/message` provider `usage` into
  per-session/per-turn token buckets, attributing each message to the model named
  by the latest `request/header` and to the Beijing hour of its event time.
- Serves the standalone overview page at `GET /dsh-token-tracker` and the JSON
  API at `GET /dsh-token-tracker/api` (`?session=<id>` returns one session's
  totals plus a per-turn breakdown).
- Prices usage with a peak/off-peak cost table (CNY per 1M tokens). The table
  resolves, in order: a browser localStorage override, a `token-pricing.json`
  file in the workspace root or a session cwd, then the built-in default (see
  `src/pricing.ts`). Overrides are picked up on a short cache.

**Browser half** (`src/client/`): registers the header token badge + period tag,
the Tracker button, the composer dock line, the closed-turn tail, and the
`conversation.view` "Token" tab. All data is fetched from the Host JSON API, so
no typert Remote surface has to ride the browser assembly bus.

## Requirements

- **Node.js** >= 20 and **pnpm** (for building the tarball / running the helper
  scripts). The plugin itself runs inside a harness `dsh` host.
- **The dsh harness** (DeepSeek-Harness) at the version that matches this
  package's peer dependencies. This plugin is a peer of the
  `@deepseek-ai/dsh-*` runtime packages and does **not** bring them itself.

---

## Installing the plugin (two-step)

> **Important.** This plugin declares the `@deepseek-ai/dsh-*` harness packages
> as **peer dependencies**, not `dependencies`. It deliberately does not pull
> them from the npm registry. This makes the install order matter.

### Step 1 — install the harness first

`dsh` needs a harness installation to satisfy the peers. Clone and install DeepSeek-Harness first:

```sh
git clone --depth 1 https://github.com/deepseek-ai/deepseek-harness.git
cd deepseek-harness
pnpm install          # installs the full @deepseek-ai/dsh-* tree locally
```

### Step 2 — install the plugin

Download `dsh-token-tracker-<version>.tgz` from the [Releases](/releases) page,
then add it to a dsh profile:

```sh
dsh plugin --profile web add ./dsh-token-tracker-<version>.tgz
```

That activates a **bundle** layer (`dsh.bundle` → `cordis.patch.yml`) so the
`token-tracker` row is inserted, and the **browser half** is auto-discovered via
the same package's `dsh.client` manifest and served from the web app.

Verify the layer is present, then boot the web server:

```sh
dsh --profile web --dump-config     # should list the token-tracker layer
dsh --profile web                   # boot the GUI + web server
```

Then open:

- `http://127.0.0.1:<port>/dsh-token-tracker` — overview page
- `http://127.0.0.1:<port>/dsh-token-tracker/api` — JSON
- the web GUI header badge / Token tab

> If `dsh` is not on your `PATH`, use the harness-local binary:
> `./node_modules/.bin/dsh ...` from the harness checkout.

### Installing from npm (optional, later)

If/when this package is published to npm under a personal scope, the same
peer-rule applies. Point `dsh plugin add` at the package instead of a tarball:

```sh
# scope-rename the package first (see RELEASING.md), then:
dsh plugin --profile web add @your-scope/dsh-token-tracker
```

---

## Pricing override

Drop a `token-pricing.json` in the workspace root or a session cwd. It is
picked up on a short cache:

```json
{
  "timezone": "Asia/Shanghai (UTC+8)",
  "peakHours": [{ "start": 9, "end": 12 }, { "start": 14, "end": 18 }],
  "models": {
    "my-model": [{
      "effectiveFrom": "2026-01-01T00:00:00+08:00",
      "prices": {
        "inputCached": { "offpeak": 0.05, "peak": 0.1 },
        "inputUncached": { "offpeak": 1.5, "peak": 3.0 },
        "output": { "offpeak": 4.5, "peak": 9.0 }
      }
    }]
  }
}
```

The built-in default prices 09–12 and 14–18 Beijing hours as **peak** (2×
off-peak) for `deepseek-v4-flash` and `deepseek-v4-pro`.

---

## Building the standalone tarball

From this repo root (a machine with network access):

```sh
pnpm install      # installs only build tooling (typescript, tsdown, react types)
node pack.mjs     # -> dsh-token-tracker-<version>.tgz
```

`pack.mjs` is **fully self-contained**:

- It assembles the stage under `standalone/` from `src/` + `publish/`.
- **Type declarations** are generated straight from `src/` by `tsc` with the
  repo-local `tsconfig.json` (self-contained; `@deepseek-ai/*` resolves to the
  ambient stubs under `types.stub/`, so no peer package is pulled to build).
- **Host + browser bundles** are produced by `tsdown` from the self-contained
  `publish/tsdown.config.ts` (which includes TypeScript decorator lowering so the
  `@Remote` markers run).
- The stage is packed with `pnpm pack`.

No harness checkout or in-repo `lib/` is required or read. The output tarball
ships the prebuilt `lib/` (host + browser + types), `cordis.patch.yml`, and the
MIT `LICENSE`, so end users can `dsh plugin add` it with no install-time build.

### Local verification after packaging

Inside a fresh harness checkout (any machine, no network if the tarball and a
harness clone are both local):

```sh
# harness already cloned + `pnpm install`ed (Step 1 of Install)
dsh plugin --profile web add ./dsh-token-tracker-0.1.0.tgz
dsh --profile web --dump-config      # token-tracker layer present
dsh --profile web                     # boot; then check:
#   /dsh-token-tracker               (overview page)
#   /dsh-token-tracker/api           (JSON)
```

---

## Known Limitations and Deferred Work

- Token accounting depends on the provider reporting `usage` on
  `assistant/message` events; without it the plugin falls back to a
  character-count estimate (marked `≈`), which is not a billing-grade count.
- Peak/off-peak pricing is timezone-anchored to Beijing time and the pricing
  cache has a short TTL, so a pricing-file edit takes a few seconds to appear.
- Peer versions in `publish/package.json` are bracketed ranges (`^0.1.0-rc.5`).
  They are satisfied by a matching harness install; keep them in step with the
  deployed harness edition, or `dsh plugin add` will warn about unsatisfied
  peers.
- The overview page auto-refreshes on a slow 10-minute interval (and pauses
  while the tab is hidden); very large session logs are capped at the first 300
  sessions in the table.

## License

[MIT](LICENSE)
