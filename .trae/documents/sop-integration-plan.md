# SOP 功能集成计划

## 摘要

参照 AgentScope 2.0.9 官方文档 [SOP 服务](https://docs.agentscope.io/zh/versions/2.0.9/deploy/sop)，在现有 Vue 2 项目中新增一个独立的 **SOP 页面**，覆盖：

1. 流程（Procedure）的增删改查；
2. 发起运行（Run）、查看运行列表与步骤进度；
3. 人工验收（Human Verifier）结论提交；
4. 运行创建出的会话跳转到现有 `/chat` 页面实时观看（复用 SSE 与工具授权 HITL）。

已与用户确认的两个关键决策：

- 运行实时观看：**跳转现有聊天页**，不在 SOP 页内嵌会话流。
- 流程编辑表单：**手写动态表单**，不基于 `GET /sop/schema` 做通用渲染（因此本期不接入 schema 端点）。

## 当前状态分析

- 项目为 Vue 2.6 + JS + Element UI + Tailwind（`tw-` 前缀），组合式 API 统一从 `src/composables/vue.js` 导入。
- 所有请求必须经 `src/api/client.js#client.request(key, options)`，端点 URL 的唯一真源是 [mapping.js](file:///Users/tang/workspace/projects/agentscope-vue/src/api/mapping.js)；当前没有任何 `/sop` 端点。
- 资源 API 采用「一个资源一个文件 + index.js 统一导出」模式，参见 [skill.js](file:///Users/tang/workspace/projects/agentscope-vue/src/api/skill.js)、[schedule.js](file:///Users/tang/workspace/projects/agentscope-vue/src/api/schedule.js)。
- 列表型功能采用 composable 封装请求，参见 [useSchedules.js](file:///Users/tang/workspace/projects/agentscope-vue/src/composables/useSchedules.js)、[useSkills.js](file:///Users/tang/workspace/projects/agentscope-vue/src/composables/useSkills.js)。
- 页面结构可参考 [knowledge/index.vue](file:///Users/tang/workspace/projects/agentscope-vue/src/views/knowledge/index.vue)：左侧资源列表 + 右侧详情面板，并用路由参数保持选中项。
- 运行会话跳转可复用聊天页已有 Query 路由：`/chat?agentId=<agentId>&sessionId=<sessionId>`，见 [router/index.js](file:///Users/tang/workspace/projects/agentscope-vue/src/router/index.js#L45-L75) 与 [views/chat/index.vue](file:///Users/tang/workspace/projects/agentscope-vue/src/views/chat/index.vue#L206-L208)。
- 会话列表按 agent 拉取（`GET /sessions/?agent_id=`），SOP 运行创建的会话会出现在对应 agent 下，因此聊天页可直接打开。
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

#### 新增 `src/views/sop/SopDetailPanel.vue`

- Props：`sop`、`runs`、`runsLoading`、`agents`。
- Emits：`start`、`edit`、`remove`、`open-run`、`delete-run`、`refresh-runs`。
- 顶部：流程名称、描述、工作区粒度、操作按钮（运行 / 编辑 / 删除）。
- 中部：步骤定义列表（序号、subject、执行者、验证者、max_attempts）。
- 底部：运行记录列表：
  - 空态「暂无运行」；
  - 每行展示创建时间、`StatusBadge`、当前步骤名（`getCurrentStepIndex`）、打开 / 删除按钮；
  - 提供手动刷新按钮。

#### 新增 `src/views/sop/SopRunDetailDrawer.vue`

- Props：`visible`、`sopRunId`。
- Emits：`update:visible`、`changed`。
- 打开 / 切换 `sopRunId` 时拉取 `sopApi.getRun`。
- 轮询：当 `state.phase` 为 `pending` / `running` / `awaiting` 时，每 2500ms 递归 `setTimeout` 重新拉取；关闭或组件卸载时清除定时器，避免请求堆积。
- 内容：
  - 顶部：运行状态、流程名、创建时间、删除运行按钮（确认后 `sopApi.removeRun`）。
  - 起步输入：`state.inputs` 的文本。
  - 步骤时间线：每步展示定义信息、步骤 `phase`、`submission` 文本、`verifications` 列表。
  - 人工验收：当 `getAwaitingHumanStepIndex(run)` 命中时，在该步骤内展示「通过 / 驳回」+ 驳回原因输入；提交调用 `sopApi.submitVerdict`，成功后用返回的运行记录刷新并 emit `changed`。
  - 工具授权等待：步骤 `phase === 'awaiting'` 且验证者不是人工时，提示「等待工具授权，请打开会话处理」。
  - 会话列表：`collectRunSessions(run)` 生成每行 `session_key`、agent 名、会话 ID，点击「打开会话」执行 `router.push({ name: 'chat', query: { agentId, sessionId } })`。

#### 新增 `src/views/sop/index.vue`

- 布局参照知识库页：左侧 `w-64` 流程列表，右侧详情。
- 使用 `useSops()`、`useSopRuns(selectedSopId)`、`useAgents()`。
- 路由参数 `sopId` 与选中项双向同步：
  - 监听 `route.params.sopId`；
  - 列表加载后若当前选中不存在，选中第一项并 `router.replace('/sop/<id>')`；
  - 无流程时 `router.replace('/sop')`。
- 左侧：标题「SOP」+ 新建按钮 + 流程列表（名称、描述截断、选中高亮）。
- 右侧：`SopDetailPanel`；未选中时展示选择提示。
- 弹窗 / 抽屉：
  - `SopEditorDialog`（创建 / 编辑，`@saved` 后刷新并选中）；
  - `StartRunDialog`（`@started` 后刷新运行列表、打开运行详情抽屉）；
  - `SopRunDetailDrawer`；
  - 删除流程 / 删除运行统一使用 `confirmDialog`。
- 接口不可用（如旧后端 404）时，右侧展示错误提示与重试按钮，不白屏。

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
  component: () => import('@/views/sop/index.vue'),
  meta: { title: 'SOP' },
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

1. **运行监控采用跳转聊天页**（用户已确认），SOP 页自身轮询运行记录展示进度，不嵌入 SSE。
2. **流程编辑采用手写动态表单**（用户已确认），本期不接入 `GET /sop/schema`。
3. `run.sessions` 按文档理解为 `{ [session_key]: session_id }`；若后端返回对象结构，`collectRunSessions` 会做兼容取值（`typeof v === 'string' ? v : v?.id`）。
4. 人工验收只允许在「验证者为 `human` 且该步骤 `phase === 'awaiting'`」时提交，避免与工具授权等待混淆。
5. 运行详情只读展示 `state.steps` 中已持久化的 `given / submission / verifications`，不额外请求会话消息。
6. 流程删除、运行删除均为级联操作，统一使用现有 `confirmDialog` 二次确认。
7. Java 中转模式仅补齐 mapping 的 `/update`、`/delete` 覆盖；实际可用性取决于 Java 中转层是否实现 SOP 转发，文档中明确标注。

## 验证步骤

1. `pnpm format:check` 通过。
2. `pnpm test:unit` 全部通过（含新增 `sop-utils.spec.js`）。
3. `pnpm build` 通过（验证 Webpack 4 编译与新页面动态导入）。
4. 启动 `pnpm dev`，打开 `/sop`：
   - 页面渲染、侧边栏入口、空态 / 错误态正常；
   - 旧后端（无 SOP 接口）下展示可读错误与重试，不白屏。
5. 在 AgentScope 2.0.9+ 后端上做端到端验证：
   - 创建流程 → 列表出现 → 编辑 → 删除；
   - 发起运行 → 运行列表出现 → 详情抽屉轮询进度；
   - 人工验收通过 / 驳回 → 运行继续；
   - 从运行详情打开会话，聊天页能看到该会话的 SSE 事件与工具授权卡片；
   - 删除运行后，相关会话在聊天页消失。
