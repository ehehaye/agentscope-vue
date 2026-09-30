# 数据流向：以 [src/views/chat/index.vue](file:///Users/tang/workspace/projects/agentscope-vue/src/views/chat/index.vue) 发起会话为例

本文以「在 `/chat?agentId=X`（尚无 `sessionId`）的会话页点击发送按钮」为入口，端到端追踪数据从组件输入到 SSE 流回放的完整走向。涉及的所有源码路径均为相对仓库根的相对路径。

## 1. 总览

```text
TextInput (组件)
   │ emit('send', contentBlocks)
   ▼
ChatContent (组件)
   │ emit('send', contentBlocks)
   ▼
views/chat/index.vue → handleSend(contentBlocks)
   │
   ├── 已有 sessionId ?
   │     └── send(contentBlocks)            ──▶ store.dispatch('chat/send', ...)
   │
   └── 无 sessionId：
         ├── extractTitle(contentBlocks)
         ├── buildSessionBody(title)
         ├── createWithInput(body, contentBlocks)   ──▶ POST /sessions/
         │       ├── chat/startCreating → chat/endCreating   （AppConnectionState.CREATING）
         │       └── chat/stageInput 暂存首条消息（pendingInput）
         └── pushConversation(agentId, newSessionId) ──▶ router.push 写入 URL
                └── 路由变化触发 openConversation，SSE onReady 后由 store 补发暂存消息

store/modules/chat.send(contentBlocks)
   │
   ├── UserMsg(contentBlocks)                ── 推入 messages
   └── chatApi.trigger({ agent_id, session_id, input: UserMsg })
                                                  │
                                                  ▼
                                       POST /chat/    (mapping.js 'chat.trigger')
                                                  │
                                                  ▼
                                          后端 AgentScope 服务
                                                  │ 立即 200，事件流不放在 body
                                                  ▼
                                       sessionApi.streamEvents(sessionId, agentId, signal, onReady)
                                                  │
                                                  ▼
                                GET /sessions/{sessionId}/stream   (SSE text/event-stream)
                                                  │
                            ┌─────────────────────┴─────────────────────┐
                            ▼                                          ▼
              SET_CONNECTION(READY)                       for await event of streamEvents
              （并就绪后补发 pendingInput）                        │
                                                                ▼
                                              store.dispatch('chat/processEvent', event)
                                                  │
                                                  ├── EventType.REPLY_START  → 新建 AssistantMsg
                                                  ├── TEXT/THINKING/TOOL_*
                                                  │     → appendEvent(msg, event) 更新 content
                                                  ├── EventType.DATA_BLOCK_* → 音频回调
                                                  ├── CUSTOM(BackendCustomEventName：
                                                  │   'team_updated' / 'state_updated'
                                                  │   / 'session_updated' / 'subagent_*')
                                                  │     → 回调 onTeamUpdated / onStateUpdated ...
                                                  └── EventType.REPLY_END    → phase = IDLE
```

## 2. 步骤分解

### 2.1 路由门禁

[src/router/index.js](file:///Users/tang/workspace/projects/agentscope-vue/src/router/index.js) 通过 `beforeEach` 强制未配置 `server_url` / `username` 时重定向到 `/setup`。会话页路径 `/chat?agentId=X&sessionId=Y&memberId=Z`，所有 agent/session 状态以 URL Query 为单一真源；组件内 `agentId / sessionId / memberId` 均为 `route.query` 的 computed。

### 2.2 视图层：[views/chat/index.vue](file:///Users/tang/workspace/projects/agentscope-vue/src/views/chat/index.vue)

`setup()` 内组合并初始化以下 composable：

| 引用 | 作用 |
| --- | --- |
| `useAgents()` | 助手列表 + CRUD |
| `useSessions(agentId)` | 当前 agent 下的会话列表（watch agentId 自动重拉）+ `createWithInput` 建会话并暂存首发消息 |
| `useAvailableModels()` | 模型组（按 type + credential 聚合） |
| `useKnowledgeBases()` | 知识库列表 |
| `useWorkspaceStatus(effectiveAgentId, effectiveSessionId, cwd)` | 工作区 git/cwd 状态 |
| `useWorkspace(effectiveAgentId, effectiveSessionId)` | MCP/Skill 增删 |
| `useMessages(effectiveAgentId, effectiveSessionId, options)` | **消息 + SSE 主入口**，见下文 |
| `provideAudioCenter()` + `useAudioCenter()` | 音频播放中心（provide/inject L2） |

模板结构：

```text
main
├── SessionList（左侧：agent + session + 新建/重命名/删除）
├── 会话区
│   ├── top bar：ConnectionStatus（连接状态灯）+ LlmSelect / ModelParametersPopover / PermissionModeSelect
│   └── ChatContent（中部：消息列表 + 输入框 + HITL）
├── PanelDock（右侧：任务/MCP/Skill/权限/知识库/团队）
└── Dialogs（AgentDialog / EditAgentDialog / RenameSessionDialog / CreateCredentialDialog）
```

### 2.3 输入入口：[TextInput](file:///Users/tang/workspace/projects/agentscope-vue/src/components/chat/TextInput.vue) → [ChatContent](file:///Users/tang/workspace/projects/agentscope-vue/src/components/chat/ChatContent.vue)

`TextInput` 用 `el-input`（autosize 1~8 行）+ `el-button`（paperclip / send-or-stop）构造 `contentBlocks` 数组（`{ type: 'text' | 'image' | 'audio' | 'file', ... }`），按下发送或 Enter+Ctrl/Meta 时 `emit('send', contentBlocks)`。

`ChatContent` 监听 `@send` → `emit('send', blocks)` 透传；同时它直接渲染 `MessageScroller + ASMessageBubble`、维护 `pendingToolCall / pendingAskUser / subagentHitl`（HITL 状态由 props 传入）、`showMaxItersAlert`、时间标记。

### 2.4 发送分支：[views/chat/index.vue#handleSend](file:///Users/tang/workspace/projects/agentscope-vue/src/views/chat/index.vue#L385-L402)

```js
async function handleSend(contentBlocks) {
  if (sessionId.value) {
    send(contentBlocks);                // 已有会话，直接发
    return;
  }
  if (!agentId.value) return;
  try {
    const title = extractTitle(contentBlocks);                       // 取首段 text，≤50 字符
    const newSessionId = await createWithInput(buildSessionBody(title), contentBlocks);
    await pushConversation(agentId.value, newSessionId);             // router.push(...sessionId=)
  } catch (e) {
    console.error('Failed to create session for sending', e);
    // 会话已创建但没能打开：回收暂存的首条消息并提示，避免消息静默丢失
    if (await discardPendingInput()) {
      MessageBox.alert('新会话未能打开，消息未发送。', '发送失败', { type: 'error' });
    }
  }
}
```

关键点：

1. **`createWithInput` → `useSessions.createWithInput`**（[useSessions.js](file:///Users/tang/workspace/projects/agentscope-vue/src/composables/useSessions.js#L64-L73)）：内部先 `create(body)`——它用 `chat/startCreating` / `chat/endCreating` 把连接状态标成 `AppConnectionState.CREATING`，覆盖「建会话 HTTP 往返 + 路由尚未切换」这段 chat 模块感知不到的空窗；随后 `chat/stageInput` 把首条消息暂存为 `pendingInput = { key, content }`，并返回新会话 id。
2. **`session.create`**：`client.request('session.create', { body })`；它会把 `freshlyCreated` 集合标记为 true（[api/session.js](file:///Users/tang/workspace/projects/agentscope-vue/src/api/session.js#L19-L23)），用于在打开新会话时跳过历史消息拉取。
3. **`pushConversation`**：把 `sessionId` 写进 URL 并返回 `router.push` 的 Promise（失败会 reject，供上面的 catch 感知）；普通的交互跳转走 `navigateTo`，它是 `pushConversation(...).catch(() => {})` 的吞错包装。
4. **首条消息为什么不在视图里 `send`**：`chatApi.trigger` 是 HTTP POST，而回复事件全部从 SSE 流回来；若在 SSE 订阅建立前触发，`REPLY_START` 等事件会因没有接收方而丢失，界面会永远停在「回复中」。因此改为暂存，等 `openConversation` 收到 `onReady` 再补发（见 2.6）。

### 2.5 消息状态机入口：[composables/useMessages.js](file:///Users/tang/workspace/projects/agentscope-vue/src/composables/useMessages.js)

```js
watch(key, (newKey, oldKey) => {
  if (newKey === oldKey) return;
  store.dispatch('chat/openConversation', {
    agentId, sessionId,
    callbacks: { onTeamUpdated, onStateUpdated, onSessionUpdated,
                 onAudioStart/Append/End, onAudioStopAll },
  });
}, { immediate: true });
```

它把响应式状态 `msgs / connection / loading / phase / subagentHitl` 从 Vuex 透出：`msgs` 的元素是 SDK 的 `Msg`，而 `connection`（AppConnectionState）与 `phase`（AppReplyPhase）是本应用自定义状态。方法 `send / onUserConfirm / onSubagentConfirm / onAskUserSubmit / onSubagentAskUserSubmit / interrupt / abort / discardPendingInput` 全部转发到 `store.dispatch`。

### 2.6 SSE 主循环：[store/modules/chat.js#openConversation](file:///Users/tang/workspace/projects/agentscope-vue/src/store/modules/chat.js#L171-L236)

```text
1. 取出 state.pendingInput（RESET 会清空它，故先暂存到局部变量）
2. RESET → SET_KEY(`${aid}:${sid}`)
3. SET_CONNECTION(LOADING)
4. const controller = new AbortController(); SET_ABORT_CONTROLLER(controller)
5. 动态 import('@/api') 拿到 sessionApi / takeFreshlyCreated
6. if (takeFreshlyCreated(sid)) {
     SET_CONNECTION(CONNECTING)              // 跳过历史拉取
   } else {
     sessionApi.messages(sid, aid)           // GET /sessions/{sid}/messages
       → SET_MESSAGES(messages)
       → 若 is_running 或 末尾消息仍有 asking/submitted tool_call → SET_PHASE(STREAMING)
       → finally: 带 key 守卫 SET_CONNECTION(CONNECTING)
   }
7. for await (const event of sessionApi.streamEvents(sid, aid, signal, onReady)) {
     // onReady: SET_CONNECTION(READY)，并在 pendingInput.key === key 时 dispatch('send') 补发首条消息
     if (state.currentKey !== key) break;     // 已切走则中断
     dispatch('chat/processEvent', { event, callbacks });
   }
   catch: SET_CONNECTION(IDLE) + SET_ERROR    // 建连失败不留在 connecting
```

`connection` 的取值与转移见第 6 节「连接状态机」。

### 2.7 多 watch 协同（[views/chat/index.vue](file:///Users/tang/workspace/projects/agentscope-vue/src/views/chat/index.vue#L661-L726)）

`sessionId` 变化时同时驱动：

| watch | 行为 |
| --- | --- |
| `watch(sessionId, ...)` | 重置 selectedPermissionMode / selectedKnowledgeConfig / tasksContext / permissionContext / pendingCwd；进入无会话时若未选模型则 `getFirstAvailableModel()` 自动选第一个 |
| `watch(view, { immediate: true })`（首次） | `seededSessionId` 标记，从 `session.state` 恢复 `tasks_context / permission_context` |
| `watch(view, { immediate: true })`（配置） | 用 `session.config` 写回 `selectedModel / selectedFallbackModel / selectedTTSModel / selectedKnowledgeConfig`；若没存过 `chat_model_config` 自动选第一个并 `sessionApi.update` 持久化 |
| `watch(view, { immediate: true })`（权限模式） | 写回 `selectedPermissionMode = state.permission_context.mode \|\| 'default'` |

### 2.8 事件分发：[store/modules/chat.js#processEvent](file:///Users/tang/workspace/projects/agentscope-vue/src/store/modules/chat.js#L188-L253)

```js
if (event.type === EventType.CUSTOM) {
  // team_updated / state_updated / session_updated
  // → callbacks.onTeamUpdated / onStateUpdated / onSessionUpdated
  // subagent_require_user_confirm / subagent_user_confirm_result
  // → 更新 subagentHitl
}
if (event.type === EventType.REPLY_START) {
  // 新一轮：AssistantMsg 推入 messages → SET_PHASE(STREAMING)
  // 上一轮未结束：只更新 currentReplyId
}
else {
  // TEXT / THINKING / TOOL_* / DATA_BLOCK / USAGE ...
  // appendEvent(reply, event) → 替换 messages[currentReplyId]
  if (event.type === EventType.REPLY_END) {
    SET_PHASE(IDLE); SET_CURRENT_REPLY_ID(null);
  }
}
// 音频 DataBlock 路由到 audioManager（provide/inject）
```

`appendEvent / AssistantMsg / UserMsg / getContentBlocks` 等工具来自 `@agentscope-ai/agentscope/message`（同一份 SDK 在官方 React 示例也直接用）。

### 2.9 触发对话：[store/modules/chat.js#send](file:///Users/tang/workspace/projects/agentscope-vue/src/store/modules/chat.js#L260-L277)

```js
const userMsg = UserMsg({ name: 'user', content: contentBlocks });
SET_MESSAGES([...messages, userMsg]);
await chatApi.trigger({
  agent_id, session_id,
  input: userMsg,
});
// POST /chat/  （mapping.js 'chat.trigger'）
```

`UserMsg` 立即出现在消息列表中（乐观更新），真正的回复以 SSE 事件流的形式通过 `streamEvents` 落到 `processEvent`。

### 2.10 HTTP 客户端：[src/api/client.js](file:///Users/tang/workspace/projects/agentscope-vue/src/api/client.js)

- 所有请求通过 `client.request(key, options)` → `resolveEndpoint(key)`（[src/api/mapping.js](file:///Users/tang/workspace/projects/agentscope-vue/src/api/mapping.js#L300-L307)）取 `{ method, path }`。
- `direct` 模式：`baseUrl = localStorage.server_url`（默认 `http://localhost:8000`，在 `/setup` 设置）。
- `proxy` 模式：`baseUrl = localStorage.proxy_url`（Java 中转），仅 GET/POST，PATCH/DELETE 自动改写为 `POST {path}/update`、`POST {path}/delete`。
- 请求头固定注入 `X-User-ID: localStorage.username`。
- `stream: true` 时返回原生 `Response`，由调用方处理（如 `streamEvents` 解析 SSE）。
- 错误归一为 `ApiError(status, detail)`，FastAPI 422 detail 数组转 `\n` 拼接。
- 代理模式下检查响应体 `{ success: false, code, message }` 并 toast 抛出。

### 2.11 HITL 闭环（确认 / 拒绝 / AskUser 提交）

| 用户操作 | 组件 | 事件 / 回调 | Vuex action | 后端 |
| --- | --- | --- | --- | --- |
| 工具调用确认/拒绝 | `ConfirmCard` → `ChatContent.onUserConfirm` | `@user-confirm` | `chat/confirm` → 构造 `USER_CONFIRM_RESULT` 事件 → `chatApi.trigger` | 前门 `/chat/`，后端按 reply_id 路由 |
| 子代理 HITL 确认/拒绝 | `SubagentHitlCard` → `ChatContent.onSubagentConfirm` | `@subagent-confirm` | `chat/subagentConfirm`（reply_id 走 worker 的） | 同上 |
| AskUser 答案提交 | `AskUserCard` → `ChatContent.submitAskUser` | `onAskUserSubmit` prop | `chat/askUserSubmit` → 构造 `EXTERNAL_EXECUTION_RESULT` 事件 → `chatApi.trigger` | 同上 |
| 子代理 AskUser 答案提交 | `SubagentHitlCard` → `ChatContent.submitSubagentAskUser` | `onSubagentAskUserSubmit` prop | `chat/subagentAskUserSubmit`（reply_id 走 worker 的） | 同上 |
| 中断 | `TextInput` 按下方块按钮 | `@interrupt` → `ChatContent.onInterrupt` | `chat/interrupt` | `POST /sessions/{sid}/interrupt` + 10s 兜底回 IDLE |

### 2.12 会话结束 / 卸载

- `chat/closeConversation`（`abort()`）调用 → `RESET` mutation（含 abort SSE 与清中断计时器）。
- `views/chat/index.vue` 在 `onUnmounted` 时执行 `abort()` + `audioManager?.disposeAll()`。

## 3. AgentScope 事件协议与解析

### 3.1 协议层：SSE over HTTP

会话实时事件通过 [src/api/session.js#streamEvents](file:///Users/tang/workspace/projects/agentscope-vue/src/api/session.js#L64-L96) 订阅：

1. 入口对应 `mapping.js` 的 `session.streamEvents`：`GET /sessions/{sessionId}/stream`（[mapping.js#L276-L278](file:///Users/tang/workspace/projects/agentscope-vue/src/api/mapping.js#L276-L278)）。
2. 响应头 `Content-Type: text/event-stream`，前端通过 `client.request({ stream: true })` 拿到原生 `Response`，再用 `response.body.getReader() + TextDecoder` 把字节流解码为文本。
3. 行格式遵循 SSE 规范：`data: <JSON>\n\n`。解码器按 `\n` 切分，`buffer` 累积尾部未完成行；每条 `data:` 行 `JSON.parse` 后 `yield` 给消费方。

`onReady?.()` 在响应头到达时立刻回调，对应 `SET_CONNECTION(READY)`（见 [store/modules/chat.js#L188-L196](file:///Users/tang/workspace/projects/agentscope-vue/src/store/modules/chat.js#L188-L196)）；它同时是「新建会话首发」补发 `pendingInput` 的触发点。`AbortSignal` 任意时刻 cancel，reader 通过 `releaseLock` 释放，for-await 抛 `AbortError`，被 store 的 `catch (e?.name !== 'AbortError')` 过滤。

### 3.2 事件 Schema

每条事件是 `@agentscope-ai/agentscope/event` 导出的 `AgentEvent` 联合类型，定义在 [node_modules/@agentscope-ai/agentscope/dist/event/index.d.ts](file:///Users/tang/workspace/projects/agentscope-vue/node_modules/@agentscope-ai/agentscope/dist/event/index.d.ts)（本仓库实际版本 `@agentscope-ai/agentscope@0.0.15`）。所有事件都继承 `EventBase { id, created_at, metadata? }`，分类如下：

| 类别 | 事件类型 | 主要字段 | 触发的副作用 |
| --- | --- | --- | --- |
| 回复边界 | `REPLY_START` | `session_id, reply_id, name, role` | 创建 `AssistantMsg`（若不存在）、`SET_CURRENT_REPLY_ID`、`SET_PHASE = STREAMING`、清中断计时器、停止上一轮音频 |
| 回复边界 | `REPLY_END` | `reply_id, finished_reason: ReplyFinishedReason, error?: ErrorInfo` | `SET_PHASE = IDLE`、清空 `currentReplyId`；消息上落地 `finished_at / finished_reason / error` |
| 回复边界 | `EXCEED_MAX_ITERS` | `reply_id, name` | 仅做提示，不参与状态切换（前端 UI 自行判断） |
| 模型调用 | `MODEL_CALL_START` | `reply_id, model_name` | 用于 HUD 展示模型名 |
| 模型调用 | `MODEL_CALL_END` | `reply_id, input_tokens, output_tokens` | 累计到 `Msg.usage.{input_tokens, output_tokens}` |
| 文本 | `TEXT_BLOCK_START / _DELTA / _END` | `reply_id, block_id, delta?` | 创建 `TextBlock{type:'text'}`、累计 `text`、`finished_at` 收尾 |
| 数据 | `DATA_BLOCK_START` | `reply_id, block_id, media_type` | 创建 `DataBlock{source:{type:'base64', data:'', media_type}}`；若 `media_type.startsWith('audio/')` 额外触发 `onAudioStart`（提供音频管理器） |
| 数据 | `DATA_BLOCK_DELTA` | `reply_id, block_id, data: base64, media_type` | base64 解码后字节合并到 `source.data`；音频 mediaType 触发 `onAudioAppend` 推送给播放器 |
| 数据 | `DATA_BLOCK_END` | `reply_id, block_id` | 关闭块 `finished_at`；触发 `onAudioEnd` |
| 思维链 | `THINKING_BLOCK_START / _DELTA / _END` | `reply_id, block_id, delta?` | 创建 `ThinkingBlock{type:'thinking'}`，delta 累加到 `thinking` 字段 |
| 提示 | `HINT_BLOCK` | `reply_id, block_id, source?, hint: string\|(TextBlock\|DataBlock)[]` | 一帧落地（不流式），把 `HintBlock` 整体推入 content；用于团队消息 / 后台工具结果 / 用户中断等 |
| 工具调用 | `TOOL_CALL_START` | `reply_id, tool_call_id, tool_call_name` | 创建 `ToolCallBlock{type:'tool_call', state:'pending', input:''}` |
| 工具调用 | `TOOL_CALL_DELTA` | `reply_id, tool_call_id, delta` | `block.input += delta`（参数 JSON 字符串增量拼接） |
| 工具调用 | `TOOL_CALL_END` | `reply_id, tool_call_id` | 标记 `tool_call.finished_at` |
| 工具结果 | `TOOL_RESULT_START` | `reply_id, tool_call_id, tool_call_name` | 创建 `ToolResultBlock{type:'tool_result', state:'running', output:[]}` |
| 工具结果 | `TOOL_RESULT_TEXT_DELTA` | `reply_id, tool_call_id, delta` | 末尾追加/续写文本块到 `output` |
| 工具结果 | `TOOL_RESULT_DATA_DELTA` | `reply_id, tool_call_id, media_type, data?\|url?` | 向 `output` 追加 `DataBlock`（base64 或 URL 源） |
| 工具结果 | `TOOL_RESULT_END` | `reply_id, tool_call_id, state: ToolResultState, metadata?` | 收尾：state=`success/error/interrupted/denied/running`、写入 metadata；同时把同 id 的 `tool_call.state = 'finished'` |
| HITL 确认 | `REQUIRE_USER_CONFIRM` | `reply_id, tool_calls: ToolCallBlock[]` | 把每个 tool_call.state 置为 `asking`，并写入 `suggested_rules`；驱动 `ConfirmCard` 显示 |
| HITL 确认 | `REQUIRE_EXTERNAL_EXECUTION` | `reply_id, tool_calls: ToolCallBlock[]` | tool_call.state 置为 `submitted`（用户已被询问但答案由前端回写） |
| HITL 确认 | `USER_CONFIRM_RESULT`（前端回写） | `reply_id, confirm_results: {confirmed, tool_call, rules?}[]` | 把对应 tool_call 从 `asking` 改成 `allowed`（确认）或 `finished`（拒绝） |
| HITL 外部执行 | `EXTERNAL_EXECUTION_RESULT`（前端回写） | `reply_id, execution_results: ToolResultBlock[]` | 把回填的 tool_result 推到 msg.content（去重 + 自动填 finished_at） |
| 自定义 | `CUSTOM` | `name, value: Record<string, unknown>` | 由 store 路由到回调：`team_updated` / `state_updated` / `session_updated` / `subagent_require_user_confirm` / `subagent_user_confirm_result` |

完整的事件 / 块 / 消息 / 错误枚举定义见 `node_modules/@agentscope-ai/agentscope/dist/event/index.d.ts` 与 `node_modules/@agentscope-ai/agentscope/dist/message/index.mjs`。

### 3.3 消费侧总图

```text
session.streamEvents(sessionId, agentId, signal, onReady)            src/api/session.js
   │ AsyncGenerator<AgentEvent>
   ▼
for await (const event of ...)                                       store/modules/chat.js#openConversation
   │ 关键：state.currentKey 已变则 break（防串数据）
   ▼
dispatch('chat/processEvent', { event, callbacks })                  store/modules/chat.js#processEvent
   │
   ├── CUSTOM  → 回调 / subagentHitl（不进入 appendEvent）
   ├── REPLY_START
   │     ├── 已存在同 reply_id 的 message → 仅切 currentReplyId
   │     └── 新 reply
   │           ├── onAudioStopAll?.()              // 停掉上一轮实时音频
   │           ├── AssistantMsg({ id, name, content: [] })   // 新 Msg
   │           ├── SET_MESSAGES([...messages, msg])
   │           └── SET_CURRENT_REPLY_ID / CLEAR_INTERRUPT_TIMER / SET_PHASE STREAMING
   │
   ├── REPLY_END
   │     ├── appendEvent(msg, event) → msg.finished_at / finished_reason / error
   │     ├── CLEAR_INTERRUPT_TIMER
   │     └── SET_PHASE IDLE / SET_CURRENT_REPLY_ID null
   │
   └── 其他 BLOCK/CALL/EVENT
         ├── replaceMessage(state.messages, currentReplyId, (reply) => {
         │     appendEvent(reply, event);          // 见 3.4
         │     return { ...reply, content: reply.content.slice() };
         │   })
         └── SET_MESSAGES(nextMessages)

   └── 并行：音频 DataBlock
         ├── DATA_BLOCK_START (media_type.startsWith('audio/'))
         │     → onAudioStart?.(block_id, media_type)
         ├── DATA_BLOCK_DELTA (audio/)
         │     → onAudioAppend?.(block_id, data)        // base64 chunk
         └── DATA_BLOCK_END
               → onAudioEnd?.(block_id)
```

实现要点（见 [store/modules/chat.js#processEvent](file:///Users/tang/workspace/projects/agentscope-vue/src/store/modules/chat.js#L293-L358)）：

- **`appendEvent` 由 SDK 提供**，不是本仓库实现。它是按 `event.reply_id` 匹配 message 后原地变更 `content` 数组的纯函数；本仓库用 `replaceMessage(state.messages, currentReplyId, …)` + 内容拷贝触发 Vuex 响应式刷新。
- **`REPLY_START` 不调用 `appendEvent`**，由 store 直接做新增 / 切换 `currentReplyId`；其他事件一律交给 SDK `appendEvent`。
- **`REPLY_END` 也走 `appendEvent`**（写入 `finished_at / finished_reason / error`），store 额外清理相位与计时器。
- **`CUSTOM` 不进 `appendEvent`**：它面向消息之外的副作用（团队 / 状态 / 子代理 HITL 列表），由 store 显式分发。
- **音频 DataBlock 与消息内容解耦**：base64 chunk 仍由 `appendEvent` 合并进 `Msg.source.data` 用于持久化；同时一份同等信息通过 callbacks 流向 `useAudioCenter`，由 `AudioInlineControl` 实时渲染播放控件。

### 3.4 `appendEvent` 行为速查（SDK）

`appendEvent(msg, event)` 是事件 → 消息状态机的核心，定义在 `node_modules/@agentscope-ai/agentscope/dist/message/index.mjs`。逐 case 的副作用：

| 事件 | msg 变化 |
| --- | --- |
| `REPLY_END` | `msg.finished_at = created_at`、`msg.finished_reason`、`msg.error = error ?? null` |
| `TEXT_BLOCK_START` | push `TextBlock{type:'text', id:block_id, text:'', created_at}` |
| `TEXT_BLOCK_DELTA` | 找同 id text 块 `block.text += delta`（找不到仅 warn） |
| `TEXT_BLOCK_END` | text 块 `finished_at = created_at` |
| `THINKING_BLOCK_START` | push `ThinkingBlock{type:'thinking', id, thinking:'', created_at}` |
| `THINKING_BLOCK_DELTA` | `block.thinking += delta` |
| `THINKING_BLOCK_END` | `finished_at = created_at` |
| `HINT_BLOCK` | push `HintBlock{type:'hint', id, hint, source, created_at, finished_at}`（一帧落地，不流式） |
| `DATA_BLOCK_START` | push `DataBlock{type:'data', source:{type:'base64', data:'', media_type}}` |
| `DATA_BLOCK_DELTA` | base64 解码后字节合并到 `source.data`（找不到块仅 warn；data 为空不写） |
| `DATA_BLOCK_END` | data 块 `finished_at = created_at` |
| `TOOL_CALL_START` | push `ToolCallBlock{type:'tool_call', id, name, input:'', state:'pending', created_at}` |
| `TOOL_CALL_DELTA` | `block.input += delta` |
| `TOOL_CALL_END` | `block.finished_at = created_at` |
| `TOOL_RESULT_START` | push `ToolResultBlock{type:'tool_result', id, name, output:[], state:'running', created_at}` |
| `TOOL_RESULT_TEXT_DELTA` | 把 `output` 维护为 `TextBlock[]`，最后一段续写或新 push |
| `TOOL_RESULT_DATA_DELTA` | push 一个 `DataBlock` 到 `output`（base64 或 URL 源） |
| `TOOL_RESULT_END` | `block.state = event.state` / `metadata` / `finished_at`；同时把同 id 的 `tool_call.state = 'finished'` |
| `MODEL_CALL_END` | 累加 `msg.usage.input_tokens / output_tokens`（首次创建 usage） |
| `REQUIRE_USER_CONFIRM` | 遍历 `event.tool_calls`：把对应 `tool_call.state = 'asking'`、写入 `suggested_rules` |
| `USER_CONFIRM_RESULT` | `state === 'asking'` 的 `tool_call` 改为 `allowed`（确认）或 `finished`（拒绝） |
| `REQUIRE_EXTERNAL_EXECUTION` | 遍历 `tool_calls.state = 'submitted'` |
| `EXTERNAL_EXECUTION_RESULT` | 把 `execution_results` 推到 `msg.content`，自动补 `finished_at`；按 id 去重 |
| `CUSTOM` | 不处理（落到外层 callbacks） |

补充约束：

- **`event.reply_id !== msg.id` 直接 `return msg` 并 warn**，避免错位串写。这是 SSE 多 reply 并发时唯一的一致性护栏。
- **`findBlock` 按 (type, id) 双键查找**；SDK 对所有 `_START/_DELTA` 都做了双键存在性检查，缺失仅 warn 不抛错。
- **错误分流**：`error: ErrorInfo { type: ErrorType, message }` 仅在 `finished_reason === ReplyFinishedReason.ERROR` 时携带。`ErrorType` 有 8 个枚举（`authentication / permission / rate_limit / invalid_request / upstream / connection / internal / unknown`），前端 UI 据此分类提示（见 [node_modules/.../event/index.d.ts#L57-L75](file:///Users/tang/workspace/projects/agentscope-vue/node_modules/@agentscope-ai/agentscope/dist/event/index.d.ts#L57-L75)）。
- **`ToolCallState` 转移图**：`pending → asking（要确认）→ allowed / finished；pending → submitted（外部执行）→ finished`。前端根据 `state` 渲染对应卡片（`ConfirmCard` / `AskUserCard` / 等待结果）。
- **`ToolResultState`**：`success / error / interrupted / denied / running`，`TOOL_RESULT_END` 直接覆盖。

### 3.5 本仓库特有的事件分支

| 事件 / 回调 | 触发位置 | 处理逻辑 | 出处 |
| --- | --- | --- | --- |
| `CUSTOM(name=BackendCustomEventName.TEAM_UPDATED)` | `processEvent` | `callbacks.onTeamUpdated?.()` → `useSessions.refresh` / `useWorkspace.refresh` | [chat.js#L296-L297](file:///Users/tang/workspace/projects/agentscope-vue/src/store/modules/chat.js#L296-L297) |
| `CUSTOM(name=BackendCustomEventName.STATE_UPDATED)` | `processEvent` | `callbacks.onStateUpdated?.(value)` → `useWorkspaceStatus.update`（驱动 cwd / git） | [chat.js#L298-L299](file:///Users/tang/workspace/projects/agentscope-vue/src/store/modules/chat.js#L298-L299) |
| `CUSTOM(name=BackendCustomEventName.SESSION_UPDATED)` | `processEvent` | `callbacks.onSessionUpdated?.()` → 重读当前 session（标签 / 配置） | [chat.js#L300-L301](file:///Users/tang/workspace/projects/agentscope-vue/src/store/modules/chat.js#L300-L301) |
| `CUSTOM(name=BackendCustomEventName.SUBAGENT_REQUIRE_USER_CONFIRM)` | `processEvent` | `SET_SUBAGENT_HITL`：去重后合并新条目 | [chat.js#L302-L304](file:///Users/tang/workspace/projects/agentscope-vue/src/store/modules/chat.js#L302-L304) |
| `CUSTOM(name=BackendCustomEventName.SUBAGENT_USER_CONFIRM_RESULT)` | `processEvent` | 从 `subagentHitl` 移除已处理项 | [chat.js#L305-L310](file:///Users/tang/workspace/projects/agentscope-vue/src/store/modules/chat.js#L305-L310) |
| `DATA_BLOCK_START`（`audio/*`） | `processEvent` | `callbacks.onAudioStart(block_id, media_type)` | [chat.js#L347-L350](file:///Users/tang/workspace/projects/agentscope-vue/src/store/modules/chat.js#L347-L350) |
| `DATA_BLOCK_DELTA`（`audio/*`） | `processEvent` | `callbacks.onAudioAppend(block_id, data)` | [chat.js#L351-L354](file:///Users/tang/workspace/projects/agentscope-vue/src/store/modules/chat.js#L351-L354) |
| `DATA_BLOCK_END` | `processEvent` | `callbacks.onAudioEnd(block_id)` | [chat.js#L355-L356](file:///Users/tang/workspace/projects/agentscope-vue/src/store/modules/chat.js#L355-L356) |
| `REPLY_START`（新一轮） | `processEvent` | `callbacks.onAudioStopAll?.()` 停掉上一轮实时音频 | [chat.js#L320-L321](file:///Users/tang/workspace/projects/agentscope-vue/src/store/modules/chat.js#L320-L321) |

### 3.6 HITL 出向事件（前端 → 后端）

下表三个 action 把 Vue 事件包成 SDK 事件后通过 `chatApi.trigger` 回传（同一条 `POST /chat/`，后端按 `reply_id` 路由）：

| 触发动作 | 构造的 SDK 事件 | reply_id 来源 | 写入 state |
| --- | --- | --- | --- |
| `confirm({ toolCall, confirm, rules })` | `USER_CONFIRM_RESULT`：`confirm_results = [{ confirmed, tool_call, rules ?? null }]` | `currentReplyId` 或末尾消息 id | `SET_CURRENT_REPLY_ID` 兜底 |
| `askUserSubmit({ toolCall, replyId, answers })` | `EXTERNAL_EXECUTION_RESULT`：`execution_results = [{ type:'tool_result', id, name, output:Q/A 文本, state:'success', metadata:{answers} }]` | 入参 `replyId` 或 `currentReplyId` | `SET_CURRENT_REPLY_ID` 兜底，便于后续无 `REPLY_START` 的事件有目标 msg |
| `subagentConfirm({ entry, toolCall, confirm, rules })` | `USER_CONFIRM_RESULT` | `entry.reply_id`（worker 的，不是 leader 的 currentReplyId） | 从 `subagentHitl` 中按 `hitlKey` 过滤掉已处理的 toolCall |
| `subagentAskUserSubmit({ entry, toolCall, answers })` | `EXTERNAL_EXECUTION_RESULT` | `entry.reply_id` | 同上 |

实现参见 [store/modules/chat.js#confirm / askUserSubmit / subagentConfirm / subagentAskUserSubmit](file:///Users/tang/workspace/projects/agentscope-vue/src/store/modules/chat.js#L404-L600)。

### 3.7 中断与超时

`interrupt({})`（[chat.js#L603](file:///Users/tang/workspace/projects/agentscope-vue/src/store/modules/chat.js#L603-L630)）：

1. 若 `phase === STREAMING` → 切到 `INTERRUPTING`，并启动 `setTimeout(INTERRUPT_TIMEOUT_MS)` 兜底（10s 后强制回 `IDLE`），避免后端不响应时界面卡住。
2. 调 `sessionApi.interrupt(sessionId, agentId)` → `POST /sessions/{sessionId}/interrupt`。
3. SSE 流收到对应 reply 的 `REPLY_END(finished_reason='interrupted')` 时由 `processEvent` 正常收尾，计时器被 `CLEAR_INTERRUPT_TIMER` 清掉。

### 3.8 SSE 解析的边界 / 已知陷阱

- **缓冲行不完整**：`streamEvents` 在 `TextDecoder.decode(value, { stream: true })` 后按 `\n` 切，**末行**（可能正跨块边界）保留在 `buffer` 与下一帧拼接；遇 `done` 后残余 `buffer` 不会被处理（设计取舍：服务端在收尾时总会以 `\n` 结束）。
- **`data:` 之外的行被忽略**：`event:` / `id:` / `retry:` 等 SSE 字段不解析；SDK 仅依赖 `data:` 行的 JSON 负载。
- **空 `data:` 行**：`if (json) yield JSON.parse(json)` 防止空行触发 `SyntaxError`。
- **`JSON.parse` 异常会上抛**：损坏的事件会终止 `for-await`、触发外层 `catch`，被 `SET_ERROR` 捕获；如果不是 `AbortError`，UI 会显示全局错误。建议后端保证单条 JSON 长度可控 / 不被截断。
- **`metadata` 字段不消费**：`EventBase.metadata` SDK 未读取，仅作透传（如排错、链路追踪）。本仓库不修改它。
- **`reply_id` 漂移**：若客户端代码改了 `state.messages` 中消息的 id（例如自定义 store 改造），`appendEvent` 会 warn 跳过；务必保持 `Msg.id === reply_id`。
- **多个 `REPLY_START` 同 id**：store 走「已存在 → 仅切 currentReplyId」分支，避免重复插入与 `onAudioStopAll` 误触。
- **音频 DataBlock 与主消息流双路**：必须在两处同时关注 — `appendEvent` 累计 base64 字节到 `Msg.source.data`（持久化用），callbacks 推送给音频管理器（`useAudioCenter`，provide/inject）。任何一处漏接都会导致 UI 与持久化不一致。

## 4. 关键不变量与边界

1. **URL Query 是会话单一真源**：所有 agent/session/member 切换都走 `router.push`，组件不持有可变状态副本。
2. **`currentKey = ${agentId}:${sessionId}`** 是 SSE 与消息状态绑定的钥匙；`useMessages` 用 `ownsConversation` 判断当前会话是否归属当前路由，避免多页面并存切换时串数据。
3. **`takeFreshlyCreated(sessionId)`**：新建会话的首帧主动跳过历史拉取，避免与「立即 POST `/chat/`」抢 SSE 流的竞态。
4. **`AppConnectionState`（本应用自定义）**：`idle → creating → loading → connecting → ready`，是「会话是否可用」的唯一真源，同时驱动输入框加载态与顶栏状态灯（`ConnectionStatus.vue`）。首条消息必须在 `ready` 之后才 trigger，否则回复事件没有接收方。
5. **`interruptTimer`（10s）**：超时兜底，避免后端没回 `REPLY_END` 时界面卡在 `interrupting`。
6. **音频 DataBlock** 不进 Vuex 消息流主路径，而是双写（`appendEvent` 持久化 + callbacks 实时播放）；`MessageBubble` 通过 `useAudioBlock` 订阅播放进度。
7. **副作用回调**（`onTeamUpdated / onStateUpdated / onSessionUpdated`）在 `useMessages` 的 options 注入，分别触发 `useSessions / useWorkspace / useWorkspaceStatus` 的 refetch 与面板自动展开。
8. **`reply_id` 一致性**：所有入向事件通过 `appendEvent` 的 `reply_id === msg.id` 校验；所有 HITL 出向事件通过 `currentReplyId` / 入参 `replyId` / `entry.reply_id` 三条路径落到对应 message。
9. **事件类型前向兼容**：SDK 联合类型新增枚举时，本仓库的 `processEvent` 走 `appendEvent` 分支（无 case 时不报错，仅当数据落到 `content` 时才需扩展 UI），新增 `CUSTOM.name` 才需要改 store。

## 5. 与官方 React 实现的差异要点

- 官方 [pages/chat/index.tsx](https://github.com/agentscope-ai/agentscope/blob/main/examples/web_ui/frontend/src/pages/chat/index.tsx) 用 TanStack React Query 缓存消息/会话，SSE 由 `hooks/useChat.ts` 处理；本仓库把状态收敛到 Vuex `chat` 模块 + `composables/useMessages` 透出。
- 官方 URL 是 `/chat/:agentId/:sessionId`，新会话通过「创建后立即 navigate」完成；本仓库为 Vue Router 兼容性用 Query 形式表达同一语义。
- 官方用 `AudioProvider`（context）注入；本仓库用 `provideAudioCenter` 注入，命名 / 用法一致。
- 官方用 `AbortSignal.timeout` 直接包 SSE fetch；本仓库走 `client.streamRequest` + `AbortSignal.any([signal, deadline])` 合并自身取消与超时，并在 `polyfills/abort-signal-polyfill` 补齐旧浏览器能力。
- 事件分发：官方由 `hooks/useChat.ts` 在 React 端 `appendEvent` 后写回 React Query 缓存；本仓库由 `store/modules/chat.js#processEvent` 显式 dispatch 到 Vuex 同步 mutation。**两边共用同一份 `@agentscope-ai/agentscope/message.appendEvent`**，所以 `Msg` 形状、状态机、ToolCall 状态机天然一致。

## 6. 常量来源与状态

本仓库用前缀区分「常量由谁定义」：

| 前缀 | 含义 | 定义位置 |
| --- | --- | --- |
| `App*` | 本应用自定义 | [store/modules/chat.js](file:///Users/tang/workspace/projects/agentscope-vue/src/store/modules/chat.js)（`AppReplyPhase` / `AppConnectionState`） |
| `Sdk*` | agentscope SDK 定义 | [src/lib/protocol.js](file:///Users/tang/workspace/projects/agentscope-vue/src/lib/protocol.js)（`SdkBlockType` / `SdkToolCallState` / `SdkToolResultState` / `SdkMessageRole`） |
| `Backend*` | 后端约定 | [src/lib/protocol.js](file:///Users/tang/workspace/projects/agentscope-vue/src/lib/protocol.js)（`BackendCustomEventName`） |

注意：`EventType` / `ReplyFinishedReason` / `ErrorType` **SDK 已提供运行时常量**，直接 `import` 使用，不经过 `protocol.js`；`protocol.js` 只镜像 SDK「仅导出 TS 类型、运行时取不到值」的那些取值（块类型判别字段、ToolCall / ToolResult 状态、消息角色）。

### 6.1 连接状态机：`AppConnectionState`（本应用自定义）

```text
idle ──startCreating()──▶ creating ──endCreating()──▶ idle      （建会话 HTTP 往返，路由尚未切换）
idle ──openConversation()──▶ loading ──历史处理完──▶ connecting ──onReady──▶ ready
                                                     connecting ──建连抛错──▶ idle
ready ──RESET / closeConversation()──▶ idle
```

- 它是「会话是否可用」的唯一真源：`preparing` getter（`creating | loading | connecting`）驱动输入框 loading 相位与内容区 spinner，`ready` 驱动顶栏状态灯变绿。
- **首条消息必须等到 `ready` 才 trigger**：`createWithInput` 把消息暂存为 `pendingInput`，由 `openConversation` 在 `onReady` 时补发（见 2.4 / 2.6）。
- 中间态不再有「历史已加载但连接未建立」的标识空白——这正是引入该枚举的原因。

### 6.2 回复相位：`AppReplyPhase`（本应用自定义）

`idle / streaming / interrupting`，只用于驱动输入框（可发送 / 可停止 / 中断中）。SDK 没有相位概念：一轮回复的边界由 `EventType.REPLY_START / REPLY_END` 表达，等待工具结果之类的内部状态由 SDK 的 `GenerateReason` 表达。

> 已知遗留：`for await` 正常结束（服务端断流）后 `connection` 不会回落，仍停留在 `ready`，状态灯会保持绿色且无重连逻辑，见第 4 节第 4 条。

## 7. 参考资料

- **上游官方仓库**：[https://github.com/agentscope-ai/agentscope](https://github.com/agentscope-ai/agentscope)
  - **Web UI 示例目录**：[https://github.com/agentscope-ai/agentscope/tree/main/examples/web_ui](https://github.com/agentscope-ai/agentscope/tree/main/examples/web_ui)
  - **React 聊天页**：[pages/chat/index.tsx](https://github.com/agentscope-ai/agentscope/blob/main/examples/web_ui/frontend/src/pages/chat/index.tsx) / [ChatViewport.tsx](https://github.com/agentscope-ai/agentscope/blob/main/examples/web_ui/frontend/src/pages/chat/ChatViewport.tsx)
  - **React 侧 useChat hook**：[hooks/useChat.ts](https://github.com/agentscope-ai/agentscope/blob/main/examples/web_ui/frontend/src/hooks/useChat.ts)
- **JS SDK（与上游共享）**：
  - **事件类型定义**：[node_modules/@agentscope-ai/agentscope/dist/event/index.d.ts](file:///Users/tang/workspace/projects/agentscope-vue/node_modules/@agentscope-ai/agentscope/dist/event/index.d.ts)（含 `EventType / ReplyFinishedReason / ErrorType / AgentEvent`）
  - **`appendEvent / UserMsg / AssistantMsg / SystemMsg / createMsg / getTextContent / getContentBlocks`**：[node_modules/@agentscope-ai/agentscope/dist/message/index.mjs](file:///Users/tang/workspace/projects/agentscope-vue/node_modules/@agentscope-ai/agentscope/dist/message/index.mjs)（含逐 case 状态机实现）
  - **Block 类型**：[node_modules/@agentscope-ai/agentscope/dist/block-CXAG11WY.d.ts](file:///Users/tang/workspace/projects/agentscope-vue/node_modules/@agentscope-ai/agentscope/dist/block-CXAG11WY.d.ts)（`TextBlock / ThinkingBlock / HintBlock / ToolCallBlock / ToolResultBlock / DataBlock / Base64Source / URLSource`）
  - **包入口**：`@agentscope-ai/agentscope` v0.0.15，[package.json](file:///Users/tang/workspace/projects/agentscope-vue/node_modules/@agentscope-ai/agentscope/package.json)
- **本仓库相关源码**：
  - SSE 解析：[src/api/session.js#streamEvents](file:///Users/tang/workspace/projects/agentscope-vue/src/api/session.js#L64-L96)
  - 事件分发：[src/store/modules/chat.js#processEvent](file:///Users/tang/workspace/projects/agentscope-vue/src/store/modules/chat.js#L293)
  - SSE 主循环：[src/store/modules/chat.js#openConversation](file:///Users/tang/workspace/projects/agentscope-vue/src/store/modules/chat.js#L171-L236)
  - HITL action：[src/store/modules/chat.js#confirm / askUserSubmit / subagentConfirm / subagentAskUserSubmit / interrupt](file:///Users/tang/workspace/projects/agentscope-vue/src/store/modules/chat.js#L404-L600)
  - 外部协议常量：[src/lib/protocol.js](file:///Users/tang/workspace/projects/agentscope-vue/src/lib/protocol.js)
  - 端点映射：[src/api/mapping.js#L276-L281](file:///Users/tang/workspace/projects/agentscope-vue/src/api/mapping.js#L276-L281)
  - 接口文档：[docs/API.md](file:///Users/tang/workspace/projects/agentscope-vue/docs/API.md)、[docs/API-java-proxy.md](file:///Users/tang/workspace/projects/agentscope-vue/docs/API-java-proxy.md)
- **相关规范**：[Server-Sent Events（HTML Living Standard）](https://html.spec.whatwg.org/multipage/server-sent-events.html)、[Fetch API（WHATWG）](https://fetch.spec.whatwg.org/)、[AbortController / AbortSignal（DOM Living Standard）](https://dom.spec.whatwg.org/#aborting-ongoing-activities)
