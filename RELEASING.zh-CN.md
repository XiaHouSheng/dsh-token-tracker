# 发布 dsh-token-tracker（GitHub Release）

> **[English](RELEASING.md)** · 阅读本页的**简体中文**版本

本插件以**自包含的可安装 tarball** 作为 GitHub Release 附件分发。最终用户下载 `dsh-token-tracker-<version>.tgz` 后执行 `dsh plugin add`（见 [README](README.md#installing-the-plugin-two-step)）。

> 这是独立的发布路径，**不**需要在 npm 发布。以后若想发 npm，见[发布到 npm](#发布到-npm可选)。

## 首次发布前

1. 把 `publish/package.json` 指向你的真实仓库：
   - `repository.url`、`homepage`、`bugs.url`
2. 让 `publish/package.json` 的 `version` 作为发布版本。
3. 保持 `peerDependencies` 里的 `@deepseek-ai/dsh-*` 区间与你目标部署的 harness 版本一致。它们由 harness 安装满足，并刻意**不是** `dependencies`（见 README「安装插件」）。

## 发布清单

```sh
# 1. 提升版本号（改 publish/package.json 的 "version"，例如 0.2.0）。
#    如希望同步，可同时提升根 package.json 的 "version" 等。

# 2. 从干净的检出里构建自包含 tarball。
cd dsh-token-tracker
pnpm install          # 只安装构建工具（typescript、tsdown、react 类型）
node pack.mjs         # -> dsh-token-tracker-<version>.tgz

# 3. 抽查 tarball（内容 + 确认 lib/types 是从 src 生成的）。
tar -tzf dsh-token-tracker-<version>.tgz
```

然后在用于分发的 **harness** 机器上做一次真实安装检查：

```sh
# harness 已克隆并执行过 `pnpm install`（安装指南的第 1 步）
dsh plugin --profile web add ./dsh-token-tracker-<version>.tgz
dsh --profile web --dump-config      # 存在 token-tracker 层
dsh --profile web                     # 启动；检查 /dsh-token-tracker + /api
```

之后到 GitHub 操作。

## 自动化发布（GitHub Actions）

仓库内已包含工作流 [`.github/workflows/release.yml`](.github/workflows/release.yml)。
它会在干净检出里构建同样的 tarball，并自动把它附件到 GitHub Release —— 你只需推一个 tag：

```sh
# 先提升 publish/package.json 的 "version"（例如 0.2.0）并提交
git commit -am "release: dsh-token-tracker 0.2.0"
git tag v0.2.0
git push origin main --tags        # Action 会自动构建并创建 Release
```

该 Action：

- 安装 Node 22 + pnpm 11，执行 `pnpm install --frozen-lockfile`；
- 运行 `node pack.mjs` 产出 `dsh-token-tracker-<version>.tgz`（版本号从 `publish/package.json` 读取）；
- 用 `softprops/action-gh-release` 创建 Release 并上传 tarball（需要 `contents: write`，仓库的 `GITHUB_TOKEN` 即可满足）。

也可以从 Actions 页面手动触发（`workflow_dispatch`）。它要求已提交 `pnpm-lock.yaml`（本仓库已带）。

下面**手动**流程创建的 Release 与之等价，二选一即可。

## 发布步骤（git + GitHub Release）

### 纯手动路径（不使用 Action）

```sh
# 4. 提交版本提升 + 构建配置。
git add publish/package.json RELEASING.md README.md
git commit -m "release: dsh-token-tracker <version>"

# 5. 打 tag。让 tarball 的名字与确切版本绑定。
git tag -a v<version> -m "dsh-token-tracker <version>"
git push origin main --tags

# 6. 创建 Release 并上传 tarball —— GitHub UI，或 gh CLI：
gh release create v<version> \
    --title "dsh-token-tracker <version>" \
    --notes "See the README for install steps. Peer deps are satisfied by installing the harness first, then: \`dsh plugin --profile web add ./dsh-token-tracker-<version>.tgz\`." \
    dsh-token-tracker-<version>.tgz

# 7. 若 README 里引用了旧的 tarball 版本，更新为新版本链接。
```

> 如果仓库已启用 `release.yml` Action，推 tag 时第 6 步（创建 Release）会由 Action 自动完成 —— 可以跳过 `gh release create`。

README 的安装说明与 Release 正文都必须写明**两步**流程：

1. `git clone` + `pnpm install` 安装 harness（把 `@deepseek-ai/*` peer 装进本地树）。
2. `dsh plugin --profile web add ./dsh-token-tracker-<version>.tgz`。

## 发布到 npm（可选）

若你更想要一个可从 npm 安装的包（个人 scope 没有限制，不像预留的 `@deepseek-ai` scope）：

1. **重命名包**为你拥有的 scope：在 `publish/package.json`（`"name"`）、tarball manifest、`cordis.patch.yml` 里那一行的 `name`、`publish/tsdown.config.ts` 里 client bundle 的 `ID`、以及浏览器 loader id 中统一改为（例如 `@<your-name>/dsh-token-tracker`）。保留 `dsh.bundle` + `dsh.client`。
2. 保持 `@deepseek-ai/dsh-*` 为 **peer**（绝不改为 `dependencies`），避免 npm 从 registry 解析它们。
3. 发布：

```sh
npm login
node pack.mjs            # 可选：先构建一次确认
pnpm --dir publish publish --publish-branch main
# 或者，如果直接发布仓库根，就在根 package.json 加发布脚本。
```

最终用户这样安装：

```sh
dsh plugin --profile web add @<your-name>/dsh-token-tracker
```

## 疑难排查 / 常见坑

- **`dsh plugin add` 提示 peer 未满足** → 说明某台 profile 的本地树没先装 harness，或 peer 区间与已装 harness 版本不匹配。请先做第 1 步（装 harness）再做第 2 步。
- **layer 在但 GUI 徽章/页签缺失** → 浏览器半部没有被提供。确认 tarball 同时带 `dsh.client`（`platform: web`）**和** `dsh.bundle`（`patch: ./cordis.patch.yml`）；两者缺一不可。
- **`node pack.mjs` 因缺 `typescript`/`tsdown` 失败** → 先在仓库根执行 `pnpm install`（仓库 devDependencies 是构建唯一需要的包；`@deepseek-ai/*` peer 构建期不会被拉取 —— 它们解析到 `types.stub/` 里的占位类型）。
