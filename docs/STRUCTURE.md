# 项目文件结构对照

本文档对照 [AgentScope 官方 Web UI 示例（React + Vite）](https://github.com/agentscope-ai/agentscope/tree/main/examples/web_ui/frontend) 与本仓库 [agentscope-vue（Vue 2.6 + vue-cli 4）](file:///Users/tang/workspace/projects/agentscope-vue) 的源码组织差异，便于迁移期对照开发。

## 1. 顶层差异

| 维度 | 官方（React） | 本仓库（Vue 2） |
| --- | --- | --- |
| 技术栈 | React 19 + TypeScript + Vite | Vue 2.6.14 + JS + vue-cli 4 / Webpack 4 |
| UI 库 | shadcn/ui + radix-ui + lucide-react + framer-motion | Element UI 2.15 + 自研 Tailwind 原子样式 |
| 样式 | Tailwind CSS v4（`@tailwindcss/vite`，`@import 'tailwindcss'`）+ CSS 变量 | Tailwind v2（`@tailwindcss/postcss7-compat`，类名 `tw-` 前缀）+ `--as-` CSS 变量 + Less |
| 状态/数据 | TanStack React Query（hooks）+ Zustand 风格 context | Vuex 3（`modules/{app,workspace,chat,upload}`）+ 组合式封装 `composables/` |
| 路由 | react-router-dom v7（路径段 `/chat/:agentId/:sessionId`） | vue-router 3（Query 形式 `/chat?agentId=&sessionId=&memberId=`） |
| 入口 | `src/main.tsx` → `App.tsx`（含 Sidebar Provider） | `src/main.js` → `App.vue`（`#as-app` 根节点 + `setupPlugins(Vue)`） |
| i18n | i18next + react-i18next | 未使用（中文硬编码） |
| Markdown | `@streamdown/*`（code/math/mermaid/cjk） | `marked` + 自渲染（`src/components/markdown/*` 未在本目录但由 `ASBlock` 等用） |
| Tour | `onborda`（`ChatTourController`） | 无对应实现 |

## 2. 目录级对照

### 2.1 官方 `frontend/src/` 顶层

```
api/                       # 各资源 fetch 封装
assets/images/             # 图片资源
components/
  badge/ chat/ dialog/ drawer/ error/ form/ hub/ knowledge/
  layout/ markdown/ panel/ popover/ select/ tour/ ui/
context/                   # AudioContext 等 Provider
hooks/                     # useAgents/useSessions/useMessages/...
i18n/                      # useI18n.ts
lib/                       # 工具
pages/                     # 业务页（路由层）
types/                     # 类型
utils/                     # 纯函数
App.tsx  index.css  main.tsx  vite-env.d.ts
```

### 2.2 本仓库 `src/` 顶层

```
api/                       # client.js + 各资源 {list,create,update,delete,...}
assets/imgs/               # 静态资源
components/
  badge/ chat/ common/ dialog/ drawer/ form/ iconify/
  knowledge/ layout/ panel/ popover/ select/ ui/
composables/               # 桥接层 + 业务 composable（useAgents/useMessages/...）
lib/                       # toast/utils
plugins/                   # setupPlugins(Vue) 拆分的子 setup
  composition-api.js element.js fonts.js styles.js index.js
polyfills/                 # AbortSignal 等旧浏览器补齐
router/                    # vue-router 实例 + setup 门禁
store/modules/             # app/workspace/chat/upload
styles/                    # index.css / base.css / atomic.css / element-overrides.less
utils/                     # 通用工具
views/                     # 业务页（路由层）
  channel/ chat/ credential/ dev/ knowledge/ mcp/ schedule/ setup/ skill/
```

## 3. 一对一对应

| 官方（React） | 本仓库（Vue 2） | 说明 |
| --- | --- | --- |
| `pages/<name>/index.tsx` | `views/<name>/index.vue` | 路由层组件。`name ∈ {chat, channel, credential, knowledge, mcp, schedule, setup, skill}` 两侧一一对应。 |
| `pages/chat/ChatViewport.tsx` | `components/chat/ChatContent.vue` | 聊天主视口：消息列表 + 输入框 + HITL。官方在 `pages/chat/`，本仓库放在 `components/chat/`。 |
| `pages/chat/index.tsx` | `views/chat/index.vue` | 聊天外壳：侧栏选 agent/session + 路由 + 面板。 |
| `hooks/use*` | `composables/use*` | 业务 composable：API 请求封装 + 响应式状态。两端 use 名一致：`useAgents / useSessions / useMessages / useChat / useWorkspace / useWorkspaceStatus / useCredentials / useAvailableModels / useAvailableTTSModels / useKbEmbeddingModels / useChunkers / useKnowledgeBaseMiddlewareSchema / useKnowledgeSupportedContentTypes / useKnowledgeBases / useKnowledgeDocuments / useMCPs / useMCPHubs / useMCPHubCards / useSkills / useSkillHubs / useSkillHubCards / useChannels / useSchedules / useDocumentStatusPolling`。 |
| `hooks/useChat` | `store/modules/chat` + `composables/useMessages` | 官方版纯 hook + Query；本仓库把消息/SSE/阶段拆到 Vuex 模块，组件通过 `useMessages` 暴露响应式状态。 |
| `hooks/useModels` | （合并到 `useAvailableModels` + `useAvailableTTSModels`） | 拆分粒度不同。 |
| `hooks/useResourceDrawer` | 无 | 官方用统一 Drawer；本仓库每个面板独立组件。 |
| `context/AudioContext.tsx`（`AudioProvider`） | `composables/useAudioCenter.js`（`provideAudioCenter` + `useAudioCenter`） | 同样的 provide/inject 音频中心。 |
| `api/*.ts`（13 个） | `api/*.js`（14 个，文件名一致 + `mapping.js` 端点表） | 文件命名 1:1：`agent / channel / chat / client / credential / health / hub / knowledgeBase / mcp / model / schedule / session / skill / workspace`。 |
| `components/chat/*`（消息/工具调用渲染） | `components/chat/*` | 一一对齐：`ASBlock / ASMessageBubble / AskUserCard / ChatContent / ConfirmCard / DataBlockView / FlipCard / MessageScroller / SessionList / SessionListItem / SubagentHitlCard / TextInput / TimeMarker / ToolCallGroup / ToolCallRow / ToolStateIcon`。 |
| `components/chat/tool-renderers/*`（官方为对应目录） | `components/chat/tool-renderers/*` | `Bash / Default / DiffPreview / Edit / Glob / Grep / Read / TaskCreate / Write` 一致。 |
| `components/dialog/*` | `components/dialog/*` | `AddMCP / AddSkill / Agent / CreateCredential / CreateKnowledgeBase / EditAgent / EditCredential / EditKnowledgeBase / InstallMCP / MCPConfigForm / RenameSession / WorkingDirectory`。 |
| `components/select/*`（`AgentSelect` 等） | `components/select/*`（`LlmSelect / PermissionModeSelect` 等） | 拆得更细一些。 |
| `components/panel/*` | `components/panel/*` | 一致 `Panel / PanelDock / PanelEmpty + KnowledgeBase / Mcp / Permission / Skill / Task / Team`。 |
| `components/popover/*` | `components/popover/*` | `ModelParametersPopover` 等。 |
| `components/layout/*` | `components/layout/*` | 入口壳 `AppLayout.vue` / `AppSidebar.vue`。 |
| `components/ui/*`（shadcn 按钮/侧栏等） | `components/ui/*` + `components/common/*` + `components/iconify/*` | shadcn 风格 → Element UI + 自研 ui/common/iconify。 |
| `components/markdown/*`（streamdown 包装） | `marked`（由 `ASBlock` 等使用） | 渲染管线不同。 |
| `components/badge/` `form/` `drawer/` `tour/` `error/` `hub/` `knowledge/` | `components/badge/` `form/` `drawer/` `knowledge/`（其余未引入） | `tour` 官方独有；`hub` 并入 `views/mcp/views/skill` 与 `useMCPHubs/useSkillHubs`。 |
| `types/`（TS 类型） | 无（迁移期未引入 TS） | — |
| `i18n/` | 无 | — |
| `App.tsx` | `App.vue`（`#as-app` 根 + Sidebar/Tabs 挂载） | 命名空间根节点不同：`#root` ↔ `#as-app`。 |
| `index.css`（`@import 'tailwindcss'` + `@custom-variant dark` + `:root{...}` + `@theme inline{...}`） | `styles/index.css`（作用域化 `@tailwind base` + Tailwind 工具层 + `--as-*` CSS 变量 + `atomic.css`） | 命名空间 / 作用域策略不同。 |

## 4. 本仓库独有/与官方不对齐的位置

- **`composables/`**：把官方 React Query 的 `use*` hook 在本仓库统一收敛为「响应式 + 方法」风格。所有 `composables/use*.js` 通过 `composables/vue.js` 桥接 `@vue/composition-api`，方便升级 Vue 3 时只换桥接层。
- **`plugins/`**：把 `Vue.use(...)` 拆成 `composition-api / element / fonts / styles` 四个独立 setup，统一从 `plugins/index.js#setupPlugins(Vue)` 调用。
- **`polyfills/`**：为不支持 `AbortSignal.any/timeout/abort` 的旧浏览器补齐，由 `main.js` 顶部引入。
- **`store/modules/`**：仅 4 个模块（`app / workspace / chat / upload`），把官方分散在 hooks/context 的可变状态收敛到 Vuex。`chat` 模块负责 SSE 事件流到消息状态的转换，`workspace` 模块管上传任务聚合。
- **`api/mapping.js`**：官方每个 api 文件直接 fetch；本仓库把 URL/Method 全部收口到 `ENDPOINTS`，按 `direct / proxy` 两种模式分发，便于接入 Java 中转服务。
- **`styles/base.css` + `atomic.css`**：本仓库特有，把 Tailwind base 预检用 `:where(#as-app)` 作用域化，再补少量从任意值语法抽离出的 `as-*` 原子类。
- **`views/setup/`、`views/dev/`**：`setup` 为后端地址/凭证等初始化门禁（`router.beforeEach` 强校验）；`dev` 为内部 Markdown 渲染验证页（`/dev/markdown`），官方未对应。

## 5. 端点映射表 `mapping.js`（本仓库特有）

`src/api/mapping.js` 是 SSOT，所有请求通过 `client.request(key, ...)` 走 `ENDPOINTS` 查表：

- 每个 key 同时声明 `direct`（直连 Python，默认 GET/POST/PATCH/DELETE）与 `proxy`（经 Java 中转，仅 GET/POST，PATCH → POST `{path}/update`，DELETE → POST `{path}/delete`）。
- 模式由 `localStorage.api_mode` 控制（`direct` / `proxy`）。
- 路径参数写作 `{name}`，由 `resolveEndpoint` 插值并 `encodeURIComponent`。
- 全量 endpoints 分类：`health / workspace / credential / model / channel / agent / schedule / knowledge_base / mcp / skill / hub / session / chat`。

接口文档拆分：

- 直连清单：[docs/API.md](file:///Users/tang/workspace/projects/agentscope-vue/docs/API.md)
- Java 中转映射版：[docs/API-java-proxy.md](file:///Users/tang/workspace/projects/agentscope-vue/docs/API-java-proxy.md)
