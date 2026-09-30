/**
 * 外部协议常量的来源集中地。
 *
 * 本仓库用前缀区分「常量是谁定义的」，避免把外部约定误当成应用自己的枚举：
 * - `Sdk*`      —— 取值由 agentscope SDK（`@agentscope-ai/agentscope`）定义。
 * - `Backend*`  —— 由本应用对接的 agent 后端约定，改动需前后端同步。
 * - `App*`      —— 本应用自定义的状态枚举，定义在 `src/store/modules/chat.js`。
 *
 * 注意：SDK 对 `EventType` / `ReplyFinishedReason` / `ErrorType` 提供了运行时常量，
 * 用到时请直接从 `@agentscope-ai/agentscope/event` 导入，不要经过本文件；
 * 本文件只镜像 SDK「仅以 TS 类型导出、运行时拿不到值」的那些取值
 * （块类型判别字段、ToolCall / ToolResult 状态、消息角色）。
 */

/**
 * SDK `ContentBlock` 的 `type` 判别字段。
 * SDK 对应类型：`TextBlock / ThinkingBlock / HintBlock / ToolCallBlock / ToolResultBlock / DataBlock`，
 * 这里只镜像本仓库会参与判断的取值。
 */
export const SdkBlockType = {
  TOOL_CALL: 'tool_call',
  TOOL_RESULT: 'tool_result',
};

/**
 * SDK `ToolCallState`：`pending → asking → allowed / finished`，
 * 或外部执行路径 `pending → submitted → finished`。
 */
export const SdkToolCallState = {
  /** @type {import('@agentscope-ai/agentscope/message').ToolCallState} */
  ASKING: 'asking',
  /** @type {import('@agentscope-ai/agentscope/message').ToolCallState} */
  SUBMITTED: 'submitted',
};

/** SDK `ToolResultState`。 */
export const SdkToolResultState = {
  /** @type {import('@agentscope-ai/agentscope/message').ToolResultState} */
  SUCCESS: 'success',
};

/** SDK 消息角色，见 `Msg.role` 与 `ReplyStartEvent.role`。 */
export const SdkMessageRole = {
  USER: 'user',
  ASSISTANT: 'assistant',
};

/**
 * 后端通过 `EventType.CUSTOM` 下发的自定义事件名。
 *
 * 非 SDK 定义：SDK 只声明了 `CustomEvent { type: 'CUSTOM', name, value }` 这个外壳，
 * `name` 的取值由后端约定，前端在 `processEvent` 里按名分发。
 */
export const BackendCustomEventName = {
  TEAM_UPDATED: 'team_updated',
  STATE_UPDATED: 'state_updated',
  SESSION_UPDATED: 'session_updated',
  SUBAGENT_REQUIRE_USER_CONFIRM: 'subagent_require_user_confirm',
  SUBAGENT_USER_CONFIRM_RESULT: 'subagent_user_confirm_result',
};
