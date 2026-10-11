# agentscope-vue

AgentScope 官方 Web UI（原 React + Vite）迁移到 Vue 2 的项目：**Vue 2.6.14 + vue-cli 4 / Webpack 4**，保留原后端协议与交互逻辑。

## Project

- 技术栈：Vue 2.6 + JS（无 TS）+ vue-router 3 + Vuex 3 + Element UI 2.15 + Tailwind v2（`@tailwindcss/postcss7-compat`）+ Less；组合式 API 由 `@vue/composition-api` 提供。
- 包管理器：**pnpm**（`pnpm-lock.yaml` / `pnpm-workspace.yaml`），不要用 npm/yarn 安装。
- 入口：`src/main.js` → `src/App.vue`（根节点 `#as-app`）→ `setupPlugins(Vue)`（`src/plugins/index.js`）。默认 dev 端口 `5173`。
- 模板允许 `?.` / `??`，经 `vue-template-babel-compiler` 编译（见 `vue.config.js`）。
- 命名空间隔离：Tailwind 类名统一 `tw-` 前缀，CSS 变量统一 `--as-`，弹层作用域见 `src/styles/index.css`。

## Commands

```bash
pnpm install
pnpm dev              # vue-cli-service serve（5173）
pnpm build            # 生产构建到 dist/
pnpm preview          # 生产模式本地预览
pnpm test:unit        # jest（tests/unit/**/*.spec.js）
pnpm test:unit:watch
pnpm format           # prettier --write
pnpm format:check
```

- 单测：jest 29 + `@vue/vue2-jest`（不走 `@vue/cli-plugin-unit-jest`），配置见 `jest.config.js`；已有 9 个 suite / 94 个用例。
- Prettier：`printWidth 120`、单引号、`singleAttributePerLine`，改完代码跑 `pnpm format:check`。

## Architecture

- `src/api/` — 后端接口层。`mapping.js` 是端点 SSOT：每个 key 声明 `direct`（Python 直连）与可选 `proxy`（Java 中转）的 `{method, path}`；`client.js` 是原生 fetch 封装（统一 `X-User-ID` 头、`ApiError`、超时、SSE/multipart）；各资源模块（`chat/agent/session/knowledgeBase/mcp/skill/...`）由此汇出（见 `index.js`）。业务代码只能 `client.request(key, {...})`，**禁止硬编码 URL**。
- `src/composables/` — 组合式逻辑。`vue.js` 是统一桥接层，所有 API 导入必须走它；`vue-router.js` 同理。`useMessages/useSessions/useChat*` 等封装各业务。
- `src/store/` — Vuex `modules/{app,workspace,chat,upload}`，由 `index.js` 组装；`app/setupComplete` 驱动 `/setup` 路由门禁。
- `src/constants/` — `app-state.js`：`AppStorageKeys`（localStorage 键 SSOT，禁止散落字面量）+ `AppDefaults` + `App*` 前端状态机枚举；`protocol.js`：SDK/后端协议枚举。
- `src/router/index.js` — history 模式；`/setup` 公开页，其余挂在 `components/layout/AppLayout.vue` 下（chat/credential/channel/schedule/knowledge/mcp/skill/dev）。
- `src/components/` — 业务组件（`chat/panel/dialog/drawer/form/...`）；`src/views/` — 页面；`src/lib/` — `toast`、工具；`src/utils/` — 纯函数（`ast/html/common/agentscope/streamingAudio`）。
- `src/polyfills/` — 旧浏览器补齐 `AbortSignal` 等，`main.js` 首行引入。

## Conventions

- 组合式 API / router 一律从 `@/composables/vue.js`、`@/composables/vue-router.js` 导入，不直接 import 底层库（便于将来升级 Vue 3 时只改桥接层）。
- 请求一律经 `src/api/client.js` + `mapping.js` 的端点 key，不写死 URL；新增端点只改 `mapping.js`。
- localStorage 键一律用 `AppStorageKeys`（唯一例外：`public/index.html` 首帧脚本里与 `THEME` 同值的字面量，改动需两边同步）。
- 样式：Tailwind 类加 `tw-`，设计令牌用 `--as-` 变量（定义在 `src/styles/index.css`）。
- `webpack 4` 限制在 `vue.config.js` 里以 alias / `transpileDependencies` 绕过（`@agentscope-ai/agentscope/event|message`、`htmlparser2`、`remend`）；新增 ESM-only 依赖需同步处理 alias 与 `jest.config.js` 的 `moduleNameMapper`/`transformIgnorePatterns`。

## Docs

- `docs/API.md`（直连清单）、`docs/API-java-proxy.md`（Java 中转映射，含 SSE/multipart/下载备注）、`docs/STRUCTURE.md`（↔ 官方 React 结构对照）、`docs/DATA-FLOW.md`（以 chat 会话为例的端到端数据流）。

## Notes

（待补充）
