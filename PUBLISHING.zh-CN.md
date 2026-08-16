# 发布与打包说明

> **[English](PUBLISHING.md)** · 阅读本页的**简体中文**版本

本仓库是 `dsh-token-tracker` 插件的**独立、可分发的源码**。它完全自包含：`node pack.mjs` 会组装并构建包（`src/` → `lib/`），只依赖本仓库的 devDependencies（`typescript`、`tsdown`、`@types/react`、`@types/node`），产出一个可安装的 `dsh-token-tracker-<version>.tgz`，全程不需要任何 harness 副本。

- **如何发布一个版本** → 见 [RELEASING.md](RELEASING.md)（git tag + GitHub Release 附件，或可选 npm）。
- **最终用户如何安装** → 见 [README.md](README.md#installing-the-plugin-two-step)（先装 harness 的两步安装）。
- **包的结构** → `publish/` 存放发布的 manifest（`publish/package.json`）、bundle 补丁层（`publish/cordis.patch.yml`）以及自包含构建（`publish/tsdown.config.ts`）。`types.stub/` 为 `@deepseek-ai/*` peer 包提供构建期环境类型，因此生成声明时无需拉取它们；对外发布的 `.d.ts` 仍引用真实的 peer 包名。

## 为什么 `@deepseek-ai/dsh-*` 保持为 peer

`publish/package.json` 把 harness 包放在 `peerDependencies`（而非 `dependencies`）：

- 因为 DSH 的安装流程要求先装 harness，最终用户本地树里已经有匹配的 `@deepseek-ai/dsh-*`。
- 如果列为 `dependencies`，安装器会尝试从 npm registry 解析它们，在版本未发布或不匹配时可能失败。

浏览器 + layer 行为需要**同时具备**两个 manifest 字段：

- `dsh.bundle` → `cordis.patch.yml` → 让 `dsh plugin add` 激活一个 layer（插入 `token-tracker` 这一行）。
- `dsh.client`（`platform: web`）→ 浏览器半部被自动发现并由 web 组合提供。

## 发布前的验证

```sh
node pack.mjs
tar -tzf dsh-token-tracker-<version>.tgz    # 应包含 lib/ + cordis.patch.yml + LICENSE
# 然后在 harness 安装里：
dsh plugin --profile web add ./dsh-token-tracker-<version>.tgz
dsh --profile web --dump-config            # token-tracker 这一层
dsh --profile web                          # 检查 /dsh-token-tracker + /dsh-token-tracker/api
```
