# dsh-token-tracker

> **[English](README.md)** · 阅读本页的**简体中文**版本

`dsh-token-tracker` 是一个 **dsh**（DeepSeek-Harness）web 插件：它从持久化的会话日志里汇总各家 provider 上报的 token 用量，用「峰谷计价表」计算费用，并在 dsh web GUI 中展示 —— 头部 token 徽章 + 时段标签、Tracker 按钮、输入框下方 dock 行、回合结束尾巴、注入的 `conversation.view`「Token」页签 —— 同时提供独立总览页和 JSON API。

本仓库**本身就是一个可直接安装的 dsh 插件包**：`lib/` 已预构建并提交，根目录同时带有 `dsh.bundle` + `dsh.client` 清单和 `cordis.patch.yml`。你可以用 `dsh plugin add <git-url>`、`dsh plugin add <本地路径>` 或（作为备选）`dsh plugin add ./dsh-token-tracker-<version>.tgz` 三种方式直接安装，**无需先手动打包再下载 tgz**。

> 注意：这不是 harness 仓库内的 `@deepseek-ai/dsh-token-tracker` 包（那个是由工作区构建的内置集成版）。两者共用同一份 `src/`，此处只是把它包装成可独立分发。

### 截图

| GUI 头部的 token 徽章与时段标签 | 会话「Token」页签 / 输入框 dock 行 | 独立总览页 |
| --- | --- | --- |
| ![GUI 头部的 token 徽章与时段标签](resources/pic1.png) | ![会话 Token 页签 / 输入框 dock 行](resources/pic2.png) | ![独立总览页](resources/pic3.png) |

### 功能

插件分 Host 半部与 Browser 半部。

**Host 半部**（`TokenTrackerService`，作为 `webServer` 的服务消费者挂载）：

- 监听 `session/event`，把 `assistant/message` 事件里 provider 上报的 `usage` 折叠成每个会话/每轮的 token 桶；每条消息按最近一次 `request/header` 里的模型名、以及事件时间对应的北京小时来归置。
- 在 `GET /dsh-token-tracker` 提供独立总览页，`GET /dsh-token-tracker/api` 提供 JSON API（`?session=<id>` 返回单会话总用量 + 每轮明细）。
- 用峰谷计价表（元 / 每百万 tokens）计费。计价表按优先级取：浏览器 localStorage 覆盖 → 工作区根目录或某个会话 cwd 下的 `token-pricing.json` → 内置默认（见 `src/pricing.ts`）。覆盖项会以短缓存被识别。

**Browser 半部**（`src/client/`）：注册头部 token 徽章 + 时段标签、Tracker 按钮、输入框 dock 行、回合结束尾巴，以及 `conversation.view`「Token」页签。所有数据都从 Host 的 JSON API 拉取，因此 typert Remote 不需要挂在浏览器装配总线上。

### 环境要求

- **Node.js** ≥ 20 与 **pnpm**（需要修改源码并重新构建时才用到；仅安装插件不需要）。插件本体跑在 harness 的 `dsh` 宿主内。
- **dsh harness**（DeepSeek-Harness），版本需与本包 peer 依赖匹配。本插件是 `@deepseek-ai/dsh-*` 运行时包的 peer，**不会**自带这些包。

---

### 安装插件（两步）

> **重要**：本插件把 `@deepseek-ai/dsh-*` harness 包声明为 **peerDependencies**（而非 `dependencies`），刻意不从 npm registry 拉取它们。因此安装顺序至关重要：**先装 harness，再装插件**。

**第 1 步 —— 先装 harness**

`dsh` 需要一个 harness 安装来满足 peer 依赖。先克隆并安装 DeepSeek-Harness：

```sh
git clone --depth 1 https://github.com/deepseek-ai/deepseek-harness.git
cd deepseek-harness
pnpm install          # 在本地树中安装全部 @deepseek-ai/dsh-* 依赖
```

**第 2 步 —— 再装插件（三选一）**

本仓库提供三种等价的安装方式，按需选用：

#### 方式 A · 直接从 GitHub 仓库 URL 安装（最推荐）

在你已装好 harness 的机器上直接执行：

```sh
dsh plugin --profile web add https://github.com/XiaHouSheng/dsh-token-tracker.git
```

原理：pnpm 克隆仓库后，会自动触发仓库里的 `prepack` 钩子，把精确的 `@deepseek-ai/*` peer 版本区间注入到打包的 manifest 中；随后把预构建好的 `lib/` + `cordis.patch.yml` 打进 tarball 并安装。全程不用你手动构建。

#### 方式 B · 从本地目录安装（插件开发/本机验证）

先在本仓库执行过一次 `pnpm run build`（见下方「开发与构建流程」），然后：

```sh
dsh plugin --profile web add D:\Xia_Project\AgentWorkSHeet\plugin-token-tracker
```

`pnpm run build` 已经把完整的 `lib/`、`cordis.patch.yml` 以及带精确 peer 区间的 publish 版 `package.json` 放到了仓库根，目录本身就是一个可安装的 dsh 插件包。

#### 方式 C · 使用 GitHub Release 附件（离线环境，最传统）

从 [Releases](/releases) 页面下载 `dsh-token-tracker-<version>.tgz`，然后：

```sh
dsh plugin --profile web add ./dsh-token-tracker-<version>.tgz
```

无论你选择哪种方式，效果都相同：会激活 **bundle** 层（`dsh.bundle` → `cordis.patch.yml`，插入 `token-tracker` 这一行）；同包的 `dsh.client` 清单让浏览器半部被自动发现并从 web app 提供。

#### 验证 layer 并启动

```sh
dsh --profile web --dump-config     # 应能看到 token-tracker 这一层
dsh --profile web                   # 启动 GUI + web 服务器
```

然后访问：

- `http://127.0.0.1:<port>/dsh-token-tracker` —— 总览页
- `http://127.0.0.1:<port>/dsh-token-tracker/api` —— JSON
- web GUI 头部徽章 / Token 页签

> 如果系统 `PATH` 里没有 `dsh`，可用 harness 里的本地二进制：先在 harness 目录执行 `./node_modules/.bin/dsh ...`。

**（可选，后续）从 npm 安装**：将来若发布到个人 scope 的 npm 包，peer 规则相同，只需把 `dsh plugin add` 指向包名：

```sh
# 先按 RELEASING.md 改 scope 包名，然后：
dsh plugin --profile web add @your-scope/dsh-token-tracker
```

---

### 计价覆盖

在工作区根目录或某个会话 cwd 下放一个 `token-pricing.json`。它以短缓存被识别：

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

内置默认把北京时 09–12 与 14–18 记为**高峰**（为 `deepseek-v4-flash` 与 `deepseek-v4-pro` 提供 2× 空闲价）。

---

### 开发与构建流程

本小节面向**插件作者/维护者**。如果你只是安装使用，可以跳过。

#### Dev manifest / Publish manifest 双形态切换

根目录的 `package.json` 会在两种形态之间切换：

| 形态 | 何时处于 | peerDependencies 里的 `@deepseek-ai/*` | 用途 |
| --- | --- | --- | --- |
| **Dev** | 刚 `git clone` 下来 / `restore-dev` 之后 | **只含 `react`** | `pnpm install` 构建依赖时：harness 版本（`^0.1.0-rc.5`）不在公共 npm，必须省略它们才能生成锁文件 |
| **Publish** | 执行 `build` / `pack` 之后，或 `prepack` 钩子期间 | **含完整 10 个 harness 包的精确区间** | 推送到 GitHub 或本地安装时：dsh 的 pnpm 布局需要它们作为 peer 显式声明，插件才能 `require('@deepseek-ai/cordis')` 等 |

两个辅助命令：

```sh
pnpm run build        # 构建 lib/，把根 manifest 切换成 Publish 形态（用于 git 提交或本地安装）
pnpm run restore-dev  # 还原为 Dev 形态（接下来要 pnpm install / 改版本 / 加 devDep 时用）
```

或直接用 `git checkout -- package.json`，效果等同。

#### 日常构建循环

```sh
# 当 package.json 正处于 Publish 形态时，先切回 Dev：
pnpm run restore-dev

pnpm install            # 只装 typescript / tsdown / react 类型等构建工具，不用拉 harness peers
# …编辑 src/*.ts…

pnpm run build          # -> lib/ 完整生成 + cordis.patch.yml 拷到根 + manifest 变成 Publish 形态
# 接下来你可以：
dsh plugin --profile web add D:\Xia_Project\AgentWorkSHeet\plugin-token-tracker   # 本地安装验证
# 以及/或者：
git add lib cordis.patch.yml package.json src scripts pack.mjs
git commit -m "feat: xxx"
git push origin main    # 推送后，其他用户即可：
                        #   dsh plugin --profile web add https://github.com/XiaHouSheng/dsh-token-tracker.git
```

#### 打包成 tgz（用于 GitHub Release / 离线分发）

```sh
pnpm run pack          # = node pack.mjs：与 build 相同，多一步在 standalone/ 里 pnpm pack
# -> dsh-token-tracker-0.1.0.tgz 出现在仓库根
```

`pack.mjs` 是**完全自包含**的：

- 它把 `src/` + `publish/` 组装到 `standalone/` 阶段目录。
- **类型声明**由仓库本地的 `tsconfig.json` 用 `tsc` 直接从 `src/` 产出（自包含；`@deepseek-ai/*` 解析到 `types.stub/` 下的环境占位类型，因此构建时无需拉取任何 peer 包）。
- **Host + 浏览器 bundle** 由自包含的 `publish/tsdown.config.ts` 用 `tsdown` 产出（含 TS 装饰器降级，让 `@Remote` 标记能运行）。
- 构建产物会同步回仓库根的 `lib/` 以便「直接安装」；同时阶段目录用 `pnpm pack` 打包成 `.tgz`。

不需要（也不读取）任何 harness 副本。

#### 本地验证

在一个全新的 harness 副本里（只要本地已执行第 1 步的 `pnpm install`）：

```sh
# 直接本地目录：
dsh plugin --profile web add D:\Xia_Project\AgentWorkSHeet\plugin-token-tracker
# 或 tgz：
dsh plugin --profile web add ./dsh-token-tracker-0.1.0.tgz

dsh --profile web --dump-config      # 存在 token-tracker 层
dsh --profile web                     # 启动后检查：
#   /dsh-token-tracker               （总览页）
#   /dsh-token-tracker/api           （JSON）
```

---

### 已知限制与待办

- token 核算依赖 provider 在 `assistant/message` 事件上上报 `usage`；缺省时会退化为按字符数估算（标记 `≈`），并非计费级精度。
- 峰谷计价以北京时间为时区锚点，且计价缓存 TTL 很短，因此编辑计价文件后需要几秒才生效。
- peer 版本在 publish 形态下使用精确区间（`^0.1.0-rc.5`）。它们由匹配的 harness 安装满足；请让它们与你部署的 harness 版本保持一致，否则 `dsh plugin add` 会提示 peer 未满足。
- 总览页以较慢的 10 分钟间隔自动刷新（标签页隐藏时暂停）；会话日志很大时，表格最多展示前 300 个会话。

### 许可证

[MIT](LICENSE)
