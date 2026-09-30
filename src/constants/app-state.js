/**
 * 本应用自定义的状态枚举（`App*` 前缀）。
 *
 * 与 `./protocol.js` 的区别：那里的取值由 agentscope SDK 或后端约定，
 * 这里的枚举是前端为驱动 UI 自己维护的状态机，SDK 没有对应概念。
 * chat 模块的状态流转与使用方式见 docs/DATA-FLOW.md 第 6 节。
 */

/**
 * 回复相位。
 *
 * SDK 没有「相位」概念：一轮回复的边界由 `EventType.REPLY_START / REPLY_END` 表达，
 * 等待工具结果之类的内部状态由 SDK 的 `GenerateReason` 表达。这里是为了驱动输入框
 * （可发送 / 可停止 / 中断中）而自己维护的较小状态机。
 */
export const AppReplyPhase = {
  IDLE: 'idle',
  STREAMING: 'streaming',
  INTERRUPTING: 'interrupting',
};

/**
 * 会话连接状态。
 *
 * 覆盖从创建会话到 SSE 就绪的完整窗口，避免「会话已创建但连接未建立」
 * 这段中间态没有任何标识。SDK 只提供事件协议，不知道前端连没连上。
 */
export const AppConnectionState = {
  /** 无会话，或已关闭。 */
  IDLE: 'idle',
  /** 正在创建会话（HTTP 往返中），此时还没有可打开的会话。 */
  CREATING: 'creating',
  /** 正在拉取历史消息。 */
  LOADING: 'loading',
  /** 历史已就绪，正在建立 SSE 连接。 */
  CONNECTING: 'connecting',
  /** SSE 已连接，可正常收发事件。 */
  READY: 'ready',
};
