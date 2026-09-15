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
| 组合式 API | `@vue/composition-api` | 业务代码统一从 `vue` / `src/composables` 桥接导入，升级时只需替换桥接层 |
| 样式 | Tailwind CSS v2（`@tailwindcss/postcss7-compat`）+ Less | — |

> 当前仓库已**直接基于 vue-cli 4 运行**。若你的老项目使用 vue-cli 4 / Vue 2.6，可直接拷贝 `src/` 下组件与视图到现有工程，替换或补充路由、store 后即可接入。

> **Tailwind 类名前缀（`tw-`）**：Tailwind 在 [tailwind.config.js](tailwind.config.js) 中统一配置了 `prefix: 'tw-'`，全项目的工具类均以 `tw-` 开头（如 `tw-flex`、`tw-bg-red-500`）。这样当你把它集成到一个已自带样式体系的现有系统时，Tailwind 的工具类不会与业务全局样式 / 其他框架（如 Element UI）产生 CSS 冲突。如需更改或移除前缀，只需调整该文件里的 `prefix` 配置，并借助代码中统一的 `tw-` 标记做全局查找替换即可，改造成本极低。

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
├── components       # 业务组件（chat、dialog、drawer、form、panel 等）
├── composables      # 组合式逻辑
├── constants        # 常量
├── lib              # 工具库/第三方适配
├── plugins          # 插件注册
├── router           # 路由
├── store            # Vuex 状态
├── styles           # 全局样式、Less 变量
├── utils            # 工具函数
└── views            # 页面视图（chat、setup、knowledge、mcp、schedule、skill 等）
```

仓库根目录另有 `docs/`：`API.md`（直连接口清单）与 `API-java-proxy.md`（Java 中转映射版）。

## 向后兼容 / 升级到 Vue 3

本仓库提供两种接入思路：

1. **直接兼容老项目**：将 `src/` 源码迁移到 Vue 2.6.14 + vue-cli 4 工程中。Element UI 2.x、vue-router 3.x、vuex 3.x 均无需升级，改动成本最低。
2. **低成本升级至 Vue 3**：当前代码已统一使用 Composition API 风格（通过 `src/composables` 桥接层导入），升级时替换桥接层为 Vue 3 内置 API 即可；Element UI 可替换为 Element Plus，vue-router / vuex 升级至 4.x，整体迁移量可控。

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
