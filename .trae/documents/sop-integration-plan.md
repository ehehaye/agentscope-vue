# SOP 功能集成计划

> **状态：已完成（2026-10-21）** — SOP 流程集成（`778c436`）与 2026-10-21 的信息架构重构均已落地；重构后的页面、交互与深链校正在本地浏览器验证通过，单测 / 格式 / 构建通过。变更内容见文末记录。

## 摘要

参照 AgentScope 2.0.9 官方文档 [SOP 服务](https://docs.agentscope.io/zh/versions/2.0.9/deploy/sop)，在现有 Vue 2 项目中新增一个独立的 **SOP 页面**，覆盖：

1. 流程（Procedure）的增删改查；
2. 发起运行（Run）、查看运行列表与步骤进度；
3. 人工验收（Human Verifier）结论提交；
4. 运行创建出的会话在 **SOP 页内嵌查看器**中实时观看（复用现有 SSE 与工具授权 HITL），不跳转聊天页。

已与用户确认的两个关键决策：

- 运行实时观看：**SOP 页内嵌只读会话查看器**（用户 2026-10-20 调整），不跳转聊天页；查看器复用 `useMessages` + `ChatContent`，保留工具授权 / AskUser / 子代理 HITL，隐藏自由输入。
- 流程编辑表单：**手写动态表单**，不基于 `GET /sop/schema` 做通用渲染（因此本期不接入 schema 端点）。

## 当前状态分析

- 项目为 Vue 2.6 + JS + Element UI + Tailwind（`tw-` 前缀），组合式 API 统一从 `src/composables/vue.js` 导入。
- 所有请求必须经 `src/api/client.js#client.request(key, options)`，端点 URL 的唯一真源是 [mapping.js](file:///Users/tang/workspace/projects/agentscope-vue/src/api/mapping.js)；当前没有任何 `/sop` 端点。
- 资源 API 采用「一个资源一个文件 + index.js 统一导出」模式，参见 [skill.js](file:///Users/tang/workspace/projects/agentscope-vue/src/api/skill.js)、[schedule.js](file:///Users/tang/workspace/projects/agentscope-vue/src/api/schedule.js)。
- 列表型功能采用 composable 封装请求，参见 [useSchedules.js](file:///Users/tang/workspace/projects/agentscope-vue/src/composables/useSchedules.js)、[useSkills.js](file:///Users/tang/workspace/projects/agentscope-vue/src/composables/useSkills.js)。
- 页面结构可参考 [knowledge/index.vue](file:///Users/tang/workspace/projects/agentscope-vue/src/views/knowledge/index.vue)：左侧资源列表 + 右侧详情面板，并用路由参数保持选中项。
- 会话流可整体复用聊天内核：`useMessages(agentId, sessionId)` 负责拉历史与 SSE，[ChatContent](file:///Users/tang/workspace/projects/agentscope-vue/src/components/chat/ChatContent.vue) 负责消息与 HITL 卡片渲染。
- Vuex chat 模块是单会话单例（`currentKey`），同一时刻只能订阅一个会话；查看器按 `session_key` 切换 tab 时，key 变化会触发自动换流。
- 查看器卸载时必须调用 `abort()`，否则离开 SOP 页后 SSE 会残留；聊天页在 [views/chat/index.vue](file:///Users/tang/workspace/projects/agentscope-vue/src/views/chat/index.vue#L553-L556) 已有同样处理。
- 消息输入体可复用 SDK 的 `UserMsg`，参见 [store/modules/chat.js](file:///Users/tang/workspace/projects/agentscope-vue/src/store/modules/chat.js#L340-L355)。
- 当前本地 `http://localhost:8000` 对 `/sop/schema` 返回 404，说明本地后端版本尚未包含 SOP 服务；功能需在 2.0.9+ 后端上做端到端验证。

## 官方接口约定（本期使用）

| 能力 | Method + Path | 请求 / 响应要点 |
|---|---|---|
| 列出流程 | `GET /sop/` | 响应 `{ sops: SOPRecord[], total }`；`SOPRecord = { id, user_id, data: SOPData, created_at, updated_at }` |
| 创建流程 | `POST /sop/` | Body `{ data: SOPData }`；响应 `{ sop_id }` |
| 读取流程 | `GET /sop/{sop_id}` | 响应 `SOPRecord` |
| 整体替换流程 | `PATCH /sop/{sop_id}` | Body `{ data: SOPData }`；响应 `SOPRecord` |
| 删除流程 | `DELETE /sop/{sop_id}` | 级联删除其全部运行 |
| 发起运行 | `POST /sop/{sop_id}/runs` | Body `{ inputs: Msg[] }`；响应 `SOPRunRecord` |
| 列出运行 | `GET /sop/runs?sop_id=&phase=` | 响应 `{ runs: SOPRunRecord[], total }`，按创建时间倒序 |
| 读取运行 | `GET /sop/runs/{sop_run_id}` | 响应 `SOPRunRecord` |
| 删除运行 | `DELETE /sop/runs/{sop_run_id}` | 级联删除运行创建的会话与工作区 |
| 人工验收 | `POST /sop/runs/{sop_run_id}/verdict` | Body `{ step_index, passed, message }`；响应更新后的 `SOPRunRecord` |

`SOPData` 结构：

```js
{
  name: string,
  description: string,
  steps: [{
    subject: string,
    description: string,
    executor: { agent_id: string, session_key: string },
    version: 'v1',
    verifier: null | { type: 'agent', agent: { agent_id, session_key }, criteria }
                    | { type: 'human', question },
    max_attempts: number, // 默认 3
  }],
  workspace_grain: 'run' | 'per_session_key',
  session_settings: {
    [session_key]: {
      chat_model_config: { type, credential_id, model, parameters },
      fallback_chat_model_config?: { ... },
      permission_mode: 'default',
    },
  },
}
```

`SOPRunRecord` / `state` 关键字段：

- `id`、`sop_id`、`definition`（发起时的 SOPData 快照）、`sessions`（`session_key -> session_id`）、`created_at`、`updated_at`。
- `state.phase`：`pending | running | awaiting | completed | failed`。
- `state.inputs`：`Msg[]`。
- `state.steps[i]`：`{ phase, given, submission, verifications }`；`verifications[j] = { passed, message, verifier, created_at }`。

## 变更文件清单

### 1. API 层

#### 新增 `src/api/sop.js`

```js
import { client } from './client';

export const sopApi = {
  list: () => client.request('sop.list'),
  get: (sopId) => client.request('sop.get', { pathParams: { sopId } }),
  create: (data) => client.request('sop.create', { body: { data } }),
  update: (sopId, data) => client.request('sop.update', { pathParams: { sopId }, body: { data } }),
  remove: (sopId) => client.request('sop.remove', { pathParams: { sopId } }),
  startRun: (sopId, inputs) => client.request('sop.startRun', { pathParams: { sopId }, body: { inputs } }),
  listRuns: (params) => client.request('sop.listRuns', { params }),
  getRun: (sopRunId) => client.request('sop.getRun', { pathParams: { sopRunId } }),
  removeRun: (sopRunId) => client.request('sop.removeRun', { pathParams: { sopRunId } }),
  submitVerdict: (sopRunId, { step_index, passed, message = '' }) =>
    client.request('sop.submitVerdict', {
      pathParams: { sopRunId },
      body: { step_index, passed, message },
    }),
};
```

#### 修改 `src/api/mapping.js`

新增 `// ---------- sop（标准作业流程与运行） ----------` 分组：

```js
'sop.list': { direct: { method: 'GET', path: '/sop/' } },
'sop.create': { direct: { method: 'POST', path: '/sop/' } },
'sop.get': { direct: { method: 'GET', path: '/sop/{sopId}' } },
'sop.update': {
  direct: { method: 'PATCH', path: '/sop/{sopId}' },
  proxy: { method: 'POST', path: '/sop/{sopId}/update' },
},
'sop.remove': {
  direct: { method: 'DELETE', path: '/sop/{sopId}' },
  proxy: { method: 'POST', path: '/sop/{sopId}/delete' },
},
'sop.startRun': { direct: { method: 'POST', path: '/sop/{sopId}/runs' } },
'sop.listRuns': { direct: { method: 'GET', path: '/sop/runs' } },
'sop.getRun': { direct: { method: 'GET', path: '/sop/runs/{sopRunId}' } },
'sop.removeRun': {
  direct: { method: 'DELETE', path: '/sop/runs/{sopRunId}' },
  proxy: { method: 'POST', path: '/sop/runs/{sopRunId}/delete' },
},
'sop.submitVerdict': { direct: { method: 'POST', path: '/sop/runs/{sopRunId}/verdict' } },
```

#### 修改 `src/api/index.js`

新增 `export { sopApi } from './sop';`。

### 2. 组合式封装

#### 新增 `src/composables/useSops.js`

参照 `useSchedules`：

- `sops`、`loading`、`error`、`refetch()`（取 `res.sops ?? []`）。
- `create(data)`：调用 `sopApi.create`，返回 `{ sop_id }`，随后 `refetch()`。
- `update(sopId, data)`、`remove(sopId)`：成功后 `refetch()`。
- `onMounted(refetch)`。

#### 新增 `src/composables/useSopRuns.js`

- 入参 `sopId`（Ref 或字符串）。
- `watch(sopId, refetch, { immediate: true })`；`sopId` 为空时 `runs = []`。
- `refetch()`：`sopApi.listRuns({ sop_id })`，取 `res.runs ?? []`。
- `start(inputs)`：返回新运行记录，随后 `refetch()`。
- `remove(runId)`：`sopApi.removeRun`，随后 `refetch()`。

### 3. SOP 页面

新建目录 `src/views/sop/`。

#### 新增 `src/views/sop/sop-utils.js`

纯函数，便于单测：

- `createEmptyStep(agentId)`：步骤默认值。
- `createEmptyForm()`：`{ name, description, workspace_grain: 'run', steps: [], session_settings: {} }`。
- `formFromData(data)`：把 `SOPData` 转成表单模型；`verifier: null` → `{ type: 'none' }`；补齐默认字段。
- `collectSessionRefs(form)`：从所有步骤收集 `{ session_key, agent_id, role }`，执行者与智能体验证者都计入。
- `validateSopForm(form)`：返回错误字符串或 `null`，规则见下文。
- `buildSopData(form)`：生成提交给后端的 `SOPData`。
- `collectRunSessions(run)`：把 `definition.steps` 与 `run.sessions` 合并成 `[{ session_key, agent_id, session_id, roles }]`。
- `getAwaitingHumanStepIndex(run)`：返回当前等待人工验收的步骤下标，否则 `-1`。
- `getCurrentStepIndex(run)`：返回第一个未完成步骤下标，用于运行列表展示。
- `flattenTextBlocks(blocks)`：把 `Msg.content` / `submission` 中的文本块拼成字符串。

`validateSopForm` 规则：

1. `name` 非空；`steps.length >= 1`。
2. 每步 `subject`、`description`、`executor.agent_id`、`executor.session_key` 均必填。
3. `verifier.type === 'agent'` 时，`verifier.agent.agent_id` 与 `verifier.agent.session_key` 必填。
4. `verifier.type === 'human'` 时，`question` 必填。
5. 同一个 `session_key` 不能指向两个不同 `agent_id`（与后端 422 规则一致）。
6. 每个被使用的 `session_key` 必须在 `session_settings` 中配置 `chat_model_config`（`credential_id` + `model`）。
7. `max_attempts` 为 >= 1 的整数。

`buildSopData`：

- `verifier.type === 'none'` → `verifier: null`。
- 只输出被步骤实际使用的 `session_settings`，避免残留配置。
- `fallback_chat_model_config` 为空时不输出该字段。
- 每步统一写入 `version: 'v1'`。

#### 新增 `src/views/sop/SopModelSelect.vue`

- 单实例模型选择器，接收父级一次性拉取的 `groups` / `loading`（来自 `useAvailableModels`），避免每个会话键都重复请求凭证与模型列表。
- 选项按「凭证类型 · 凭证名 · 模型」展示，选中后 emit `{ type, credential_id, model, parameters: {} }`。
- 支持 `clearable`（用于备用模型）与已有值回显。

#### 新增 `src/views/sop/SopEditorDialog.vue`

- Props：`visible`、`sop`（编辑对象，创建时为 `null`）、`agents`。
- Emits：`update:visible`、`saved(sopId)`。
- 打开时：`form = sop ? formFromData(sop.data) : createEmptyForm()`；首个执行者默认使用 `agents[0]?.id`。
- 表单区块：
  - 基本信息：名称、描述、`workspace_grain`（`run` / `per_session_key`）。
  - 步骤：可增删；每步包含 subject、description、执行者（AgentSelect + 会话键输入）、验证者类型（无 / 智能体 / 人工）、智能体验证者的 AgentSelect + 会话键 + criteria、人工验证者的 question、`max_attempts`。
  - 会话设置：对 `collectSessionRefs` 得到的每个唯一 `session_key`，展示一行「主模型 / 备用模型 / 权限模式」；主模型必填，备用模型可清空。
- 保存前调用 `validateSopForm`，失败时在弹窗内展示错误，不发请求。
- 保存调用 `sopApi.create/update`；成功后 emit `saved` 并关闭。
- 动态新增 `session_settings[key]` 时使用 `@/composables/vue` 的 `set`，保证 Vue 2 响应式。

#### 新增 `src/views/sop/StartRunDialog.vue`

- Props：`visible`、`sop`。
- Emits：`update:visible`、`started(run)`。
- 可选文本输入；提交时若非空则构造 `UserMsg({ name: 'user', content: [{ id: crypto.randomUUID(), type: 'text', text, created_at, finished_at }] })`，否则 `inputs = []`。
- 调用 `sopApi.startRun(sop.id, inputs)`，成功后 emit `started(run)`。
- 弹窗内展示请求错误与 loading。

#### 新增 `src/views/sop/SopDetailView.vue`

- 路由页 `/sop/:sopId`，通过 `sopApi.get` 拉取流程。
- 顶部：返回列表、流程名称 / 描述 / 工作区粒度，右侧发起运行 / 编辑 / 删除（纯图标）。
- 左侧固定宽度展示步骤定义（独立滚动）。
- 右侧运行记录（独立滚动）：
  - 使用无边框 `el-table` 呈现，保留表头排序交互但外观接近列表；按「日期」「状态」排序由前端查询层完成。
  - 支持标题模糊搜索、状态完全匹配、日期（到日）筛选；条件为草稿，放在 `el-form` 中，点击「查询」或回车才生效，「重置」清空条件并重新查询。
  - 每页条数可选 10 / 25 / 50，页码与每页条数均在前端处理；总条数展示在标题右上角。
  - 筛选条件、排序、页码与每页条数都写入 query；从运行详情返回时原样恢复，删除导致页数减少时自动回退。
- 点击运行跳转 `/sop/:sopId/runs/:runId`；发起运行后直接进入运行详情。

#### 新增 `src/views/sop/SopStepStrip.vue`

- 横向步骤条：序号、标题（截断）、`StatusBadge`，只保留必要信息；未开始（`pending`）的步骤禁用点击并显示禁止光标。
- 激活项使用主色边框；激活步骤变化时横向滚动到可视区域。

#### 新增 `src/views/sop/SopStepDelivery.vue`

- 当前步骤的说明、执行者 / 验证者 / 最大尝试次数。
- 交付物按内容块渲染：文本块经 `ASBlock` 使用 `MarkdownRenderer` 输出 Markdown；`data` / `tool_call_group` 等沿用既有渲染。
- 交付内容右上角提供打印按钮（复用 `PrintHistoryButton`，打印目标为交付物本身）。
- 验证记录；步骤 `awaiting` 且不是人工验收时，提示到「会话」标签页处理工具授权。

#### 新增 `src/views/sop/SopRunView.vue`

- 路由页 `/sop/:sopId/runs/:runId`；轮询规则与原运行详情一致（`pending` / `running` / `awaiting` 时每 2500ms 拉取）。
- 深链中的 `sopId` 与运行记录不一致时，以运行的 `sop_id` 为准 `router.replace` 纠正路由，返回按钮随之回到正确的流程。
- 顶部：返回流程、运行名、状态、创建时间 + 起步输入、刷新 / 删除（红色）。
- 主体：横向步骤条 + 下方「交付 / 会话」两个 Tab；Tab 状态按步骤独立记忆，切换步骤只影响该步骤自己的 Tab。
- `activeStepIndex` 是唯一状态源：
  - 初始用 `getInitialStepIndex` 选中：全部结束取第一步，否则取最新开始步骤；
  - `getFollowingStepIndex` 发现新步骤进入 `running` / `awaiting` 时自动切换；
  - 用户手动点击步骤后保持，直到下一次新步骤开始。
- 在「会话」Tab 下切换步骤时，用 `collectStepAnchorIds` / `findStepMessageIndex` 定位该步骤在会话中的起点（同一会话被多个步骤复用时同样生效）。
- 人工验收表单在「交付」Tab 内展示，提交 `sopApi.submitVerdict`。
- 删除运行后返回流程详情，并保留分页 query。

#### 修改 `src/views/sop/SopSessionViewer.vue`

- 改为受控组件：Props `entries`、`agents`、`runId`、`sessionKey`、`focusRequest`；不再自行决定默认会话或跟随步骤。
- 不再展示会话切换 tab：本期人工验收模式下每个步骤只有一个执行者会话，顶部只显示当前会话键与连接状态。
- 保留 `ConnectionStatus`、消息定位、`abort()` 与音频清理。
- 本期只支持人工验收模式；智能体验收的验证者会话查看暂不单独支持，后续再补。

#### 修改 `src/components/chat/ChatContent.vue`

- 新增 `hideInput`：隐藏输入框与 cwd 入口，保留上方 HITL 卡片；底部容器保持挂载，避免 HITL 卡片收起时过渡被打断。
- 只读模式下在右下角悬浮渲染 `PrintHistoryButton`（有消息且无 HITL 待办时显示），绝对定位不占用消息区高度。
- 新增 `emptyText`：允许内嵌场景自定义空态文案。

#### 修改 `src/views/sop/index.vue`

- 改为流程列表页（`/sop`）：全宽卡片网格，展示名称、描述、步骤数、工作区粒度。
- 新建流程复用 `SopEditorDialog`，保存后跳转详情页。
- 列表、详情、运行详情拆成三个路由页，不再在单页内用 `activeRunId` 切换。
- 接口不可用（如旧后端 404）时展示错误提示与重试按钮，不白屏。

### 4. 路由与导航

#### 修改 `src/router/index.js`

在 `AppLayout` children 中新增：

```js
{
  path: 'sop',
  name: 'sop',
  component: () => import('@/views/sop/index.vue'),
  meta: { title: 'SOP' },
},
{
  path: 'sop/:sopId',
  name: 'sop-detail',
  component: () => import('@/views/sop/SopDetailView.vue'),
  meta: { title: 'SOP' },
},
{
  path: 'sop/:sopId/runs/:runId',
  name: 'sop-run',
  component: () => import('@/views/sop/SopRunView.vue'),
  meta: { title: 'SOP 运行' },
},
```

#### 修改 `src/components/layout/AppSidebar.vue`

`navItems` 在「日程」之后新增：

```js
{ to: { name: 'sop' }, icon: 'lucide:list-checks', label: 'SOP' },
```

#### 修改 `src/components/badge/StatusBadge.vue`

补充两个状态分支（保持现有 running / completed / failed 不变）：

- `awaiting`：黄色系，文案「待处理」，图标 `lucide:clock`。
- `pending`：弱化色，文案「等待开始」，图标 `lucide:circle-dashed`。

### 5. 文档

- `docs/API.md`：新增「14. sop（SOP 流程与运行）」章节，列出 10 个 `client.request` 端点；文首接口总数由 80 更新为 90。
- `docs/API-java-proxy.md`：新增 SOP 章节，注明 `PATCH` / `DELETE` 的 `/update`、`/delete` 映射；接口总数由 83 更新为 93，并注明 Java 中转层需同步支持这些路径。
- `docs/STRUCTURE.md`：`views/` 列表补充 `sop/`，API 文件数量说明同步更新。
- `AGENTS.md`：路由列表补充 `sop`。

### 6. 单元测试

新增 `tests/unit/sop-utils.spec.js`，覆盖：

- `createEmptyForm` / `formFromData` 的默认值与 verifier 归一化。
- `validateSopForm`：
  - 合法表单通过；
  - 空步骤、缺会话键、会话键与智能体冲突、缺模型配置分别报错。
- `buildSopData`：`verifier.type === 'none'` → `null`；未使用的 `session_settings` 被裁剪。
- `collectRunSessions`：正确关联 `session_key -> session_id` 并合并执行者 / 验证者角色。
- `getAwaitingHumanStepIndex`：仅人工验证者且步骤 `awaiting` 时返回下标。
- `flattenTextBlocks`：拼接文本块并忽略非文本块。

## 假设与决策

1. **运行监控采用页内会话查看器**（用户 2026-10-20 确认），SOP 页自身轮询运行记录，同时由内嵌查看器订阅 SSE，不跳转聊天页。
2. **流程编辑采用手写动态表单**（用户已确认），本期不接入 `GET /sop/schema`。
3. `run.sessions` 按文档理解为 `{ [session_key]: session_id }`；若后端返回对象结构，`collectRunSessions` 会做兼容取值（`typeof v === 'string' ? v : v?.id`）。
4. 人工验收只允许在「验证者为 `human` 且该步骤 `phase === 'awaiting'`」时提交，避免与工具授权等待混淆。
5. 运行详情按步骤组织：「交付」Tab 只读展示 `state.steps` 中已持久化的 `given / submission / verifications`，交付物按 Markdown 渲染；「会话」Tab 由受控查看器单独拉取与订阅，两者互不依赖。
6. 流程删除、运行删除均为级联操作，统一使用现有 `confirmDialog` 二次确认。
7. Java 中转模式仅补齐 mapping 的 `/update`、`/delete` 覆盖；实际可用性取决于 Java 中转层是否实现 SOP 转发，文档中明确标注。
8. 运行记录分页只做前端：后端 `GET /sop/runs` 不支持分页参数，前端一次性取回后按每页 10 条切片。
9. 本期只支持人工验收模式；运行详情固定展示当前步骤的执行者会话，不提供会话切换。智能体验收的验证者会话查看暂不单独支持。

## 验证步骤

> 1–4 项已在本地执行通过；第 5 项中的页面跳转、查询 / 排序 / 分页、步骤联动、会话定位、深链纠正与打印入口已在本地浏览器验证。人工验收提交、工具授权与 SSE 推进仍需在 AgentScope 2.0.9+ 后端上按真实运行确认。

1. `pnpm format:check` 通过。
2. `pnpm test:unit` 通过（SOP 相关 56 个用例；`md-markdown-renderer` / `md-node-renderer` 为既有失败，与本功能无关）。
3. `pnpm build` 通过（验证 Webpack 4 编译与新页面动态导入）。
4. 启动 `pnpm dev`，打开 `/sop`：
   - 页面渲染、侧边栏入口、空态 / 错误态正常；
   - 旧后端（无 SOP 接口）下展示可读错误与重试，不白屏。
5. 在 AgentScope 2.0.9+ 后端上做端到端验证：
   - 流程列表 → 流程详情 → 运行详情三级路由跳转正常，侧边栏 SOP 保持高亮；
   - 创建流程 → 列表出现 → 编辑 → 删除；
   - 发起运行 → 运行记录出现 → 点击进入运行详情；
   - 运行详情顶部步骤条随新步骤开始自动切换，点击步骤会更新「交付」Tab 与「会话」Tab 的定位；
   - 交付物以 Markdown 渲染，验证记录与人工验收正常；
   - 「会话」Tab 能看到 SSE 事件与工具授权卡片，确认操作可推进步骤；
   - 返回流程详情时保留运行记录分页页码；
   - 删除运行后返回流程详情，运行列表刷新。

## 变更记录

### 2026-10-21 · UI 信息架构重构

- 列表 / 流程详情 / 运行详情拆成三个路由页：`/sop`、`/sop/:sopId`、`/sop/:sopId/runs/:runId`；删除 `SopDetailPanel.vue`、`SopRunDetailView.vue`。
- 流程详情：左侧步骤定义、右侧运行记录；运行记录改为无边框 `el-table`，支持按日期 / 状态排序，标题模糊、状态精确、日期到日搜索（`el-form` 查询 / 回车提交、「重置」），每页 10 / 25 / 50 条前端分页，总数放在标题右上角。
- 运行详情：顶部横向步骤条（序号 / 标题 / 状态），未开始步骤禁用点击；下方「交付 / 会话」Tab，每个步骤独立记忆自己的 Tab。步骤状态变化时自动跟随，点击步骤联动下方内容。
- 交付物改用 `ASBlock` + `MarkdownRenderer` 按内容块渲染，不再输出纯文本；交付内容支持打印（复用 `PrintHistoryButton`）。
- 查询逻辑收敛到 `useSopRunQuery` composable：过滤、排序、分页均在前端完成，UI 只传条件、拿结果，便于日后切换服务端查询。
- `SopSessionViewer` 改为受控且不再提供会话切换：人工验收模式下每个步骤只有一个执行者会话，只展示当前会话。
- 修正分页细节：`el-pagination--small` 的每页条数下拉框默认仍为 28px，统一压到 22px 与页码对齐；表格末尾增加 12px 占位列，避免 macOS 覆盖式纵向滚动条压住操作列。
- 运行列表的筛选、排序、页码与每页条数写入路由 query，从运行详情返回时原样恢复；运行详情深链的 `sopId` 与实际归属不一致时自动纠正。
- 新增组件测试：步骤条禁用/点击、`useSopRunQuery` 查询行为、运行详情自动跟随、按步骤 Tab 记忆、深链归属校正；Jest 模板编译切换到 `vue-template-babel-compiler` 以支持模板中的 `?.`。
- 定位到步骤消息后，消息节点短暂闪烁背景（`data-sop-flash` + CSS 动画，1.4s 两次脉冲），用属性而非 class 以避开 Vue 重新渲染时的 class 覆盖。
- 以上改动整理为基于 `c469be8` 的单个提交。
- 本期验证者会话按人工验收场景支持，智能体验收会话暂不单独展示。
- `sop-utils` 以 `getInitialStepIndex` / `getFollowingStepIndex` 取代会话键选择函数，新增运行筛选 / 排序 / 分页与展示辅助函数，补充对应单测。

### 2026-10-20 · 运行会话改为页内查看

- 移除跳转聊天页方案：不再从运行详情 `router.push` 到 `/chat`。
- 运行详情从右侧抽屉改为页内分栏视图（`SopRunDetailView.vue`）：左栏步骤 / 人工验收，右栏会话。
- 新增 `SopSessionViewer.vue`：复用 `useMessages` + `ChatContent`，按 `session_key` 切换会话 tab，只读 + HITL。
- `ChatContent.vue` 新增 `hideInput` / `emptyText`，供内嵌只读场景使用。
- 删除 `SopRunDetailDrawer.vue`；`index.vue` 用 `activeRunId` 在流程详情与运行详情之间切换。
- API 与 `sop-utils` 无变更。

### 2026-10-20 · 布局与交互打磨

- **页面高度溢出修复**：项目使用的 Tailwind v2 不生成 v3 的 `size-*` 工具类，`tw-size-full` 一直没有 CSS，导致页面根节点高度为 `auto`。在 `src/styles/atomic.css` 补上 `.tw-size-full { width/height: 100% }`（同时修复 schedule / knowledge / mcp / skill 页的同源隐患），并给 `AppLayout` 路由容器补 `tw-h-full`，确保子页面百分比高度可解析。
- **运行详情布局**：顶部压缩为 48px 单行（状态 / 时间在右，标题 `flex-1` 撑满并截断）；移除重复的「会话」标题行，标签并入 tab 栏；`el-divider` 的 24px 外边距覆盖 `tw-m-0`，统一替换为 1px 分隔条；左栏宽度 `w-80`、`xl` 起 `w-96`；已完成 / 失败运行隐藏刷新按钮。
- **刷新抖动修复**：`el-button` 的 `:loading` 会插入额外图标撑高按钮，导致头部和内容区位移。运行详情与运行记录的刷新按钮改为 `:disabled` + 图标 `tw-animate-spin`，尺寸全程不变。
- **只读会话**：`ChatContent` 在 `hideInput` 下保留右下角打印按钮；HITL 确认 / AskUser 仍可用。
- **运行记录标题**：以 `state.inputs` 的首段文本作为标题，单行截断并提供 `title` 提示；副行显示时间与当前步骤。
- **图标与配色**：流程详情头部操作改为纯图标、无背景按钮，头部高度收紧；统一删除图标样式 `.run-delete-btn`（`--as-destructive`，悬停 `brightness(0.85)`），规则放入 `src/styles/element-overrides.less` 以便流程详情与运行详情共用。
- **验证**：`pnpm build`、Prettier 通过；浏览器实测页面高度收敛、刷新无位移、运行标题截断正常。仓库内 `tests/unit` 的 `md-markdown-renderer` / `md-node-renderer` 两个套件存在与本功能无关的既有失败，SOP 相关测试全部通过。
