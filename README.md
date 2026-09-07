# AgentScope Web UI — Vue 2 迁移版

本项目基于 [AgentScope 官方 Web UI 示例](https://github.com/agentscope-ai/agentscope/tree/main/examples/web_ui) 进行 Vue 2 迁移改造，目标是在国内最常见的 Vue 2 老项目技术栈（**Vue 2.6.14 + vue-cli 4 / Webpack 4~5**）下可直接运行、可复用、可二次开发。

## 项目背景

原示例为 React 实现，为了让现有 Vue 2 业务低成本接入 AgentScope 的聊天、知识库、MCP、定时任务等能力，我们将其完整迁移为 Vue 组件体系，同时保留原项目的交互逻辑与后端协议。

## 技术栈与兼容策略

| 依赖 | 当前参考实现 | 最低兼容目标 |
|------|--------------|--------------|
| Vue | 2.6.14 | 2.6.14 |
| 构建工具 | Vite 3 + `vite-plugin-vue2` | vue-cli 4 / Webpack 4~5 |
| 路由 | vue-router 3.x | vue-router 3.x |
| 状态管理 | vuex 3.x | vuex 3.x |
| UI 组件库 | Element UI 2.15.x | Element UI 2.15.x |
| 组合式 API | @vue/composition-api 1.7.x | @vue/composition-api 1.7.x（可选） |
| 样式 | Tailwind CSS v4 + Less | Tailwind CSS v3/v4 + Less |

> 当前仓库使用 Vite 作为**参考运行环境**，源码写法尽量规避 Vite 专属语法；若你的老项目使用 vue-cli 4，可直接拷贝 `src/` 下组件与视图到现有工程，替换或补充路由、store 后即可接入。

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

默认端口 `5173`。前端通过 `localStorage.server_url` 直连 Python 后端；若后端起在本机 `8000`，可在 setup 页填写 `http://localhost:8000`。

## 目录结构

```
src/
├── api              # 后端接口封装
├── assets           # 图片、字体等静态资源
├── components       # 业务组件（chat、dialog、drawer、form、panel 等）
├── composables      # 组合式逻辑
├── constants        # 常量
├── i18n             # 国际化
├── lib              # 工具库/第三方适配
├── plugins          # 插件注册
├── router           # 路由
├── store            # Vuex 状态
├── styles           # 全局样式、Less 变量
├── utils            # 工具函数
└── views            # 页面视图（chat、setup、knowledge、mcp、schedule、skill 等）
```

## 向后兼容 / 升级到 Vue 3

本仓库提供两种接入思路：

1. **直接兼容老项目**：将 `src/` 源码迁移到 Vue 2.6.14 + vue-cli 4 工程中。Element UI 2.x、vue-router 3.x、vuex 3.x 均无需升级，改动成本最低。
2. **低成本升级至 Vue 3**：当前代码已使用 `@vue/composition-api`，Element UI 可替换为 Element Plus，vue-router / vuex 升级至 4.x，整体迁移量可控。

具体迁移步骤与注意事项可参考 `migration/` 目录下的分析文档。

## 相关链接

- [AgentScope 官方仓库](https://github.com/agentscope-ai/agentscope)
- [原 Web UI 示例](https://github.com/agentscope-ai/agentscope/tree/main/examples/web_ui)
