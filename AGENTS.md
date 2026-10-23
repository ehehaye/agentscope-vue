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

- 单测：jest 29 + `@vue/vue2-jest`（不走 `@vue/cli-plugin-unit-jest`），配置见 `jest.config.js`；模板编译使用 `vue-template-babel-compiler` 以支持 `?.`，与构建保持一致。当前 20 个 suite / 183 个用例，全部通过；`tests/unit/setup.js` 通过 `setupFiles` 全局安装 Composition API。
- Prettier：`printWidth 120`、单引号、`singleAttributePerLine`，改完代码跑 `pnpm format:check`。

## Architecture

- `src/api/` — 后端接口层。`mapping.js` 是端点 SSOT：每个 key 声明 `direct`（Python 直连）与可选 `proxy`（Java 中转）的 `{method, path}`；`client.js` 是原生 fetch 封装（统一 `X-User-ID` 头、`ApiError`、超时、SSE/multipart）；各资源模块（`chat/agent/session/knowledgeBase/mcp/skill/...`）由此汇出（见 `index.js`）。业务代码只能 `client.request(key, {...})`，**禁止硬编码 URL**。
- `src/composables/` — 组合式逻辑。`vue.js` 是统一桥接层，所有 API 导入必须走它；`vue-router.js` 同理。`useMessages/useSessions/useChat*` 等封装各业务。
- `src/store/` — Vuex `modules/{app,workspace,chat,upload}`，由 `index.js` 组装；`app/setupComplete` 驱动 `/setup` 路由门禁。
- `src/constants/` — `app-state.js`：`AppStorageKeys`（localStorage 键 SSOT，禁止散落字面量）+ `AppDefaults` + `App*` 前端状态机枚举；`protocol.js`：SDK/后端协议枚举。
- `src/router/index.js` — history 模式；`/setup` 公开页，其余挂在 `components/layout/AppLayout.vue` 下（chat/credential/channel/schedule/sop/knowledge/mcp/skill/dev）。
- `src/components/` — 业务组件（`chat/exports/panel/dialog/drawer/form/md/sop/...`）；`src/views/` — 页面；`src/lib/` — `toast`、工具；`src/utils/` — 纯函数（`ast/html/common/agentscope/sop/streamingAudio/export/word/file`）。
- `src/components/md/` — Markdown 渲染层：`MarkdownRenderer.vue`（`marked` + `highlight.js` + `remend` + `htmlparser2` 生成 AST）→ `NodeRenderer.vue` / `TextNodeRenderer.vue` 递归渲染；`marked.js` 集中 marked renderer/lexer 配置，`render.js` 提供「md → 消毒 HTML」共享入口；`registry.js` 注册代码块/标签自定义组件（`registerCodeBlockComp` / `registerTagComp`，可选 `toDocx` 参与 Word 导出）；`diff.js` 做块级增量解析（流式从 O(n²) 降到 O(n)）。内部验证页 `src/views/dev/MarkdownDevPage.vue`（`/dev/markdown`）。
- `src/components/exports/` — 导出入口：`ExportButton.vue` 按 `type` 分发（默认 `word`，可选 `pdf`）到 `ExportWordButton.vue`（会话消息 → docx）与 `ExportPdfButton.vue`（区域打印/PDF）。Word 管线分两层：`utils/export.js` 负责会话语义（角色标签、用户纯文本），`utils/word.js` 是通用 Markdown/HTML AST → docx 转换器（`docx` 按需懒加载），两者不互相耦合。
- `src/polyfills/` — 旧浏览器补齐 `AbortSignal` 等，`main.js` 首行引入。

## Conventions

- 组合式 API / router 一律从 `@/composables/vue.js`、`@/composables/vue-router.js` 导入，不直接 import 底层库（便于将来升级 Vue 3 时只改桥接层）。
- 请求一律经 `src/api/client.js` + `mapping.js` 的端点 key，不写死 URL；新增端点只改 `mapping.js`。
- localStorage 键一律用 `AppStorageKeys`（唯一例外：`public/index.html` 首帧脚本里与 `THEME` 同值的字面量，改动需两边同步）。
- 样式：Tailwind 类加 `tw-`，设计令牌用 `--as-` 变量（定义在 `src/styles/index.css`）。
- `webpack 4` 限制在 `vue.config.js` 里以 alias / `transpileDependencies` 绕过（`@agentscope-ai/agentscope/event|message`、`htmlparser2`、`remend`）；新增 ESM-only 依赖需同步处理 alias 与 `jest.config.js` 的 `moduleNameMapper`/`transformIgnorePatterns`。
- 工具结果监听：`useMessages(..., { tools: { [toolName]: (tool) => {}, '*': fallback } })`，在 `TOOL_RESULT_END` 后按工具名分发；`tool = { name, input, output }` 由 `src/utils/agentscope.js#findToolBlocks` 反查，分发逻辑在 `store/modules/chat.js#processEvent`。
- 导出：Markdown → docx 统一走 `src/utils/word.js`（通用，不含角色/消息语义）；会话级语义（角色标签、用户纯文本、连续同角色合并）放 `src/utils/export.js#buildExportSections`；按钮与排版原语在 `src/components/exports/`。新增可导出的 Markdown 自定义节点时，在 `registry.js` 的注册项里提供 `toDocx(props, ctx)` 即可。

## Docs

- 仓库内：`docs/API.md`（直连清单）、`docs/API-java-proxy.md`（Java 中转映射，含 SSE/multipart/下载备注）、`docs/STRUCTURE.md`（↔ 官方 React 结构对照）、`docs/DATA-FLOW.md`（以 chat 会话为例的端到端数据流）。
- **AgentScope 官方文档（查阅资料）**：[`https://docs.agentscope.io/llms.txt`](https://docs.agentscope.io/llms.txt) —— LLM 友好的文档总索引，进入后按 `/_llms/*` 索引逐级下钻到具体页面。需确认后端行为、协议语义、SDK API 时优先查它。
  - 版本化入口：`https://docs.agentscope.io/zh/versions/<version>`；该 `<version>` 取自 `package.json` 的 `version`——它代表**本项目实现/对齐到的 AgentScope 版本**（当前 2.0.9），`AppSidebar.vue` 据此链接到对应版本文档。
  - 新项目用 `/stable/`；不要混用 AgentScope 1.x 与 2.x API；引用安装/示例代码时标明版本。

## Notes

- 版本号：`package.json` 的 `version` 代表**本项目实现/对齐到的 AgentScope 版本**（非本 UI 自身版本），是唯一来源；`AppSidebar.vue` 直接 import 并链接到 `https://docs.agentscope.io/zh/versions/<version>`（当前 2.0.9），跟进新 AgentScope 版本时同步升级。
- Markdown 渲染：流式消息统一走 `src/components/md/`（见 Architecture）。拼接后的 HTML 必须整体经 DOMPurify 消毒一次（如 `md/diff.js`、`src/views/mcp/HubPanel.vue` 的 readme），不要拆分 sanitize。
- Markdown 导出：`utils/word.js` 复用 `md/render.js` 的消毒 HTML 与 `registry.js` 的节点匹配规则（`data-lang` / `tagName`），因此新增自定义节点只需在注册处补 `toDocx`；`docx` 依赖必须保持按需 `import()`，避免进入首屏包。
