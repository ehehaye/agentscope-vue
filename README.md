# AgentScope Web UI — Vue 2 迁移版

本项目基于 [AgentScope 官方 Web UI 示例](https://github.com/agentscope-ai/agentscope/tree/main/examples/web_ui) 进行 Vue 2 迁移改造，目标是在国内最常见的 Vue 2 老项目技术栈（**vue-cli 4 / Webpack 4~5**）下可直接运行、可复用、可二次开发。

## 项目背景

原示例为 React 实现，为了让现有 Vue 2 业务低成本接入 AgentScope 的聊天、知识库、MCP、定时任务等能力，我们将其完整迁移为 Vue 组件体系，同时保留原项目的交互逻辑与后端协议。

## 技术栈与兼容策略

| 依赖 | 当前实现 | 说明 |
| --- | --- | --- |
| Vue | 2.6.14 | 兼容 Vue 2.6 老项目；模板中的 `?.` / `??` 语法通过 `vue-template-babel-compiler` 支持 |
| 构建工具 | vue-cli 4.5 + Webpack 4 | 当前仓库已直接基于 vue-cli 4 运行 |
| 路由 | vue-router 3.x | — |
| 状态管理 | vuex 3.x | — |
| UI 组件库 | Element UI 2.15.x | — |
| 组合式 API | `@vue/composition-api` | 由 [src/plugins/composition-api.js](src/plugins/composition-api.js) 统一注册；业务代码统一从 [src/composables/vue.js](src/composables/vue.js) 桥接导入，升级时只需替换桥接层 |
| 样式 | Tailwind CSS v2（`@tailwindcss/postcss7-compat`）+ Less | 类名、CSS 变量、根容器均做了命名空间隔离，见下文 |
| 旧浏览器兼容 | `abort-signal-polyfill` + core-js | 启动时经 [src/polyfills/index.js](src/polyfills/index.js) 引入，为不支持 `AbortSignal.any / timeout / abort` 的旧浏览器补齐能力（按 CJS 路径引入，规避老构建工具的 `exports` 字段限制） |

> 当前仓库已**直接基于 vue-cli 4 运行**。若你的老项目使用 vue-cli 4 / Vue 2.6，可直接拷贝 `src/` 下组件与视图到现有工程，替换或补充路由、store 后即可接入。

> **命名空间隔离（`tw-` / `--as-` / `#as-app`）**：为最大限度降低接入已有样式体系时的冲突，项目对「类名、CSS 变量、根容器」三个层面都做了统一前缀：
>
> - **Tailwind 类名**：在 [tailwind.config.js](tailwind.config.js) 中配置 `prefix: 'tw-'`，工具类均以 `tw-` 开头（如 `tw-flex`、`tw-bg-red-500`），不会与业务全局样式或 Element UI 冲突。
> - **CSS 变量**：所有设计令牌（design token）统一以 `--as-` 前缀声明（如 `--as-primary`、`--as-border`），集中定义在 [src/styles/index.css](src/styles/index.css) 的 `:root` / `.dark`；Tailwind 主题色再映射到这些变量（如 `colors.primary: 'var(--as-primary)'`）。
> - **根容器**：应用根节点 id 为 `as-app`（见 [src/App.vue](src/App.vue)）。Tailwind 的 `@tailwind base` 预检样式被拷贝为 [src/styles/base.css](src/styles/base.css)，并为全部选择器加上 `:where(#as-app)` 作用域，仅作用于 `#as-app` 内部，避免影响宿主系统；该文件由 [src/styles/index.css](src/styles/index.css) 首行 `@import` 引入。若不需要作用域控制，直接清空 base.css 并改回 `@tailwind base` 即可。
>
> 另有少量从 Tailwind 任意值语法抽离出的原子类，统一放在 `as-` 前缀的 [src/styles/atomic.css](src/styles/atomic.css) 中。如需更改或移除前缀，只需调整上述配置，并借助代码中统一的 `tw-` / `--as-` 标记做全局查找替换即可，改造成本极低。

## 运行方式

```bash
# 安装依赖
pnpm install

# 开发
pnpm dev

# 构建
pnpm build

# 预览产物
pnpm preview
```

默认端口 `5173`。前端支持两种后端接入方式（见下一节）：直连 Python（默认，setup 页填写 `localStorage.server_url`，如本机 `http://localhost:8000`）或经 Java 服务中转（`localStorage.proxy_url`）。

## 接口与后端接入（直连 / Java 中转）

所有请求统一由端点映射表驱动：业务代码只调用 `client.request(key, { pathParams, params, body, ... })`，不再硬编码 URL。

- **映射表**：[src/api/mapping.js](src/api/mapping.js) 是唯一真源（SSOT），每个端点一个 key，分别声明 `direct` 与 `proxy` 两种 `{ method, path }`；路径参数写作 `{xxx}`，由 `resolveEndpoint` 插值并 URL 编码。
- **模式切换**：由 `localStorage.api_mode` 控制（`direct` 默认 / `proxy`），可运行时调用 `setApiMode(API_MODES.PROXY)` 切换。

| 模式 | Base URL | Method | 说明 |
| --- | --- | --- | --- |
| `direct`（默认） | `localStorage.server_url` | GET / POST / PATCH / DELETE | 直连 Python 后端 |
| `proxy` | `localStorage.proxy_url`（未配置时回退 `server_url`） | 仅 GET / POST | 经 Java 中转：PATCH → `POST {path}/update`，DELETE → `POST {path}/delete` |

```js
import { setApiMode, API_MODES } from '@/api';

setApiMode(API_MODES.PROXY); // 之后全部请求自动走中转地址与 GET/POST 映射
```

- **接口文档**：直连清单见 [docs/API.md](docs/API.md)，Java 中转映射版（含映射后 URL/Method、SSE/multipart/文件下载等特殊场景备注）见 [docs/API-java-proxy.md](docs/API-java-proxy.md)。
- **特殊响应**：SSE 事件流（`stream: true` 拿原始 Response）、multipart 上传（XHR）、带 token 的文件下载同样从映射表取路径，中转层需按文档备注做流式/二进制透传，不能按普通 JSON 处理。

## 目录结构

```
src/
├── api              # 后端接口封装 + 端点映射表（mapping.js：direct 直连 / proxy Java 中转）
├── assets           # 图片、字体等静态资源
├── components       # 业务组件（chat、panel、dialog、drawer、form、layout、ui、iconify 等）
├── composables      # 组合式逻辑
├── lib              # 工具库/第三方适配
├── plugins          # 插件注册（composition-api、element、fonts、styles 各自独立的 setup 函数）
├── polyfills        # 旧浏览器能力补齐（AbortSignal 等）
├── router           # 路由
├── store            # Vuex 状态
├── styles           # 全局样式：base.css（作用域化的 @tailwind base 预检）、index.css（Tailwind + CSS 变量）、atomic.css、element-overrides.less、Less 变量
├── utils            # 工具函数
└── views            # 页面视图（chat、setup、knowledge、mcp、schedule、skill 等）
```

仓库根目录另有 `docs/`：`API.md`（直连接口清单）与 `API-java-proxy.md`（Java 中转映射版）。

## 向后兼容 / 升级到 Vue 3

本仓库提供两种接入思路：

1. **直接兼容老项目**：将 `src/` 源码迁移到 Vue 2.6.14 + vue-cli 4 工程中。Element UI 2.x、vue-router 3.x、vuex 3.x 均无需升级，改动成本最低。全局依赖（`@vue/composition-api`、Element UI、字体、样式）已拆分为 `src/plugins` 下各自独立的 setup 函数，入口只需调用 `setupPlugins(Vue)`；对旧版浏览器则通过 `src/polyfills` 补齐 `AbortSignal` 等能力。
2. **低成本升级至 Vue 3**：当前代码已统一使用 Composition API 风格（通过 `src/composables` 桥接层导入），升级时替换桥接层与 `src/plugins` 中的注册逻辑为 Vue 3 内置 API 即可；Element UI 可替换为 Element Plus，vue-router / vuex 升级至 4.x，整体迁移量可控。

## 相关链接

- [AgentScope 官方仓库](https://github.com/agentscope-ai/agentscope)
- [原 Web UI 示例](https://github.com/agentscope-ai/agentscope/tree/main/examples/web_ui)

## 开源许可

本项目基于 [Apache License 2.0](LICENSE) 许可开源：

```
Copyright 2026 hongxin.tang@hotmail.com

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0
```

本项目衍生自 AgentScope 官方 Web UI 示例（上游同样采用 Apache License 2.0），上游版权与衍生关系说明详见 [NOTICE](NOTICE) 文件。
