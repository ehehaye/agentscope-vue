/**
 * 本应用自定义的状态枚举与常量（`App*` 前缀）。
 *
 * 与 `./protocol.js` 的区别：那里的取值由 agentscope SDK 或后端约定，
 * 这里的枚举是前端为驱动 UI 自己维护的状态机，SDK 没有对应概念。
 * chat 模块的状态流转与使用方式见 docs/DATA-FLOW.md 第 6 节。
 */

/**
 * localStorage 持久化键（SSOT）。
 *
 * 所有 `localStorage.setItem / getItem` 都必须使用这里的常量，禁止散落字符串字面量。
 * 唯一例外：`public/index.html` 的首帧脚本早于模块系统执行、无法 import，
 * 以字符串字面量保持与 `THEME` 同值，修改时两边必须同步。
 */
export const AppStorageKeys = {
  /** 主题：'dark' | 'light'；index.html 首帧脚本同源读取。 */
  THEME: 'as-theme',
  /** 后端 Base URL（direct 直连地址，或 proxy 含中转前缀的地址）。 */
  SERVER_URL: 'as-server_url',
  /** 用户名，同时作为 X-User-ID 请求头。 */
  USERNAME: 'as-username',
  /** API 接入模式：'direct'（默认）| 'proxy'，取值见 api/mapping.js 的 API_MODES。 */
  API_MODE: 'api_mode',
  /** 侧边栏收起状态：'true' | 'false'。 */
  SIDEBAR_COLLAPSED: 'as-sidebarCollapsed',
  /** 聊天页右侧面板停靠布局（JSON 序列化的二维数组）。 */
  CHAT_PANEL_LAYOUT: 'as-chat_panel_layout',
};

/**
 * 连接配置未持久化时的兜底默认值（store 初始值与请求层共用）。
 */
export const AppDefaults = {
  SERVER_URL: 'http://localhost:8000',
  USERNAME: 'demo',
};

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
