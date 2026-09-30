/**
 * Vuex chat 模块。
 *
 * 职责：持有当前会话的消息列表与 SSE 订阅，并把 SDK 事件分发给消息状态机。
 *
 * 常量来源（详见 `src/lib/protocol.js` 的说明）：
 * - SDK 提供：`EventType` 事件类型、`UserMsg / AssistantMsg / appendEvent` 等消息工具、块与工具状态；
 * - 本应用自定义：本文件的 `AppReplyPhase` / `AppConnectionState`，以及 `currentKey` /
 *   `pendingInput` / `subagentHitl` 等 state 字段——SDK 不提供这些概念，全部由前端维护。
 */
import { EventType } from '@agentscope-ai/agentscope/event';
import { appendEvent, AssistantMsg, UserMsg } from '@agentscope-ai/agentscope/message';
import {
  BackendCustomEventName,
  SdkBlockType,
  SdkMessageRole,
  SdkToolCallState,
  SdkToolResultState,
} from '@/lib/protocol';

/**
 * 回复相位（本应用自定义）。
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
 * 会话连接状态（本应用自定义）。
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

const INTERRUPT_TIMEOUT_MS = 10000;

/** 末尾消息是否停在待用户处理的工具调用上（取值均为 SDK 定义的块类型 / 工具状态）。 */
function hasPendingToolCall(msg) {
  if (!msg || msg.role !== SdkMessageRole.ASSISTANT) return false;
  for (const block of msg.content) {
    if (block.type !== SdkBlockType.TOOL_CALL) continue;
    if (block.state === SdkToolCallState.ASKING || block.state === SdkToolCallState.SUBMITTED) return true;
  }
  return false;
}

export function hitlKey(e) {
  return `${e.worker_session_id}:${e.reply_id}`;
}

function replaceMessage(messages, id, updater) {
  const idx = messages.findIndex((m) => m.id === id);
  if (idx === -1) return messages;
  const next = updater(messages[idx]);
  const copy = messages.slice();
  copy[idx] = next;
  return copy;
}

export default {
  namespaced: true,

  state: () => ({
    /** SDK 的 `Msg[]`，由 `appendEvent` 维护块与收尾字段。 */
    messages: [],
    /** 本应用自定义：回复相位，取值见 AppReplyPhase。 */
    phase: AppReplyPhase.IDLE,
    /** 最近一次交互的错误（HTTP / SSE 层抛出的 Error）。 */
    error: null,
    /** 本应用自定义：当前会话 key `${agentId}:${sessionId}`，与 URL Query 对应。 */
    currentKey: null,
    /** 本应用自定义：子代理 HITL 待办，由后端自定义事件 subagent_* 驱动。 */
    subagentHitl: [],
    /** SDK 事件里的 `reply_id`，指向 messages 中正在流式的那条。 */
    currentReplyId: null,
    /** 本应用自定义：会话连接状态，取值见 AppConnectionState。 */
    connection: AppConnectionState.IDLE,
    /**
     * 本应用自定义：新建会话首发的暂存消息 `{ key, content }`。
     * trigger 必须晚于 SSE 订阅建立，否则回复事件没有接收方会丢，故先暂存。
     * @type {{ key: string, content: object[] }|null}
     */
    pendingInput: null,
    /** @type {AbortController|null} SSE 订阅的取消句柄。 */
    abortController: null,
    /** 本应用自定义：中断兜底计时器。 */
    interruptTimer: null,
  }),

  mutations: {
    SET_KEY(state, key) {
      state.currentKey = key;
    },
    SET_MESSAGES(state, messages) {
      state.messages = messages;
    },
    SET_PHASE(state, phase) {
      state.phase = phase;
    },
    SET_CONNECTION(state, connection) {
      state.connection = connection;
    },
    SET_PENDING_INPUT(state, pending) {
      state.pendingInput = pending;
    },
    SET_ERROR(state, error) {
      state.error = error;
    },
    SET_SUBAGENT_HITL(state, list) {
      state.subagentHitl = list;
    },
    SET_CURRENT_REPLY_ID(state, id) {
      state.currentReplyId = id;
    },
    SET_ABORT_CONTROLLER(state, controller) {
      state.abortController = controller;
    },
    SET_INTERRUPT_TIMER(state, timer) {
      state.interruptTimer = timer;
    },
    CLEAR_INTERRUPT_TIMER(state) {
      if (state.interruptTimer) {
        clearTimeout(state.interruptTimer);
        state.interruptTimer = null;
      }
    },
    RESET(state) {
      state.messages = [];
      state.phase = AppReplyPhase.IDLE;
      state.error = null;
      state.currentKey = null;
      state.subagentHitl = [];
      state.currentReplyId = null;
      state.connection = AppConnectionState.IDLE;
      state.pendingInput = null;
      if (state.abortController) {
        state.abortController.abort();
        state.abortController = null;
      }
      if (state.interruptTimer) {
        clearTimeout(state.interruptTimer);
        state.interruptTimer = null;
      }
    },
  },

  actions: {
    /**
     * 初始化并打开一个会话：拉历史、开 SSE、处理事件。
     * @param {object} ctx
     * @param {{ agentId: string|null, sessionId: string|null, callbacks?: object }} payload
     */
    async openConversation({ commit, state, dispatch }, { agentId, sessionId, callbacks = {} }) {
      const key = agentId && sessionId ? `${agentId}:${sessionId}` : null;
      // RESET 会清空 pendingInput，先取出暂存消息，待连接就绪后补发
      const pending = state.pendingInput;
      // 清理旧连接与状态
      commit('RESET');
      commit('SET_KEY', key);
      if (!key) return;

      commit('SET_CONNECTION', AppConnectionState.LOADING);
      const controller = new AbortController();
      commit('SET_ABORT_CONTROLLER', controller);

      try {
        const { sessionApi, takeFreshlyCreated } = await import('@/api');

        if (takeFreshlyCreated(sessionId)) {
          commit('SET_CONNECTION', AppConnectionState.CONNECTING);
        } else {
          try {
            const { messages, is_running: isRunning } = await sessionApi.messages(sessionId, agentId);
            if (state.currentKey !== key) return;
            commit('SET_MESSAGES', messages || []);
            const tail = messages && messages.length > 0 ? messages[messages.length - 1] : null;
            if (isRunning || hasPendingToolCall(tail)) {
              commit('SET_PHASE', AppReplyPhase.STREAMING);
              if (hasPendingToolCall(tail)) {
                commit('SET_CURRENT_REPLY_ID', tail.id);
              }
            }
          } catch (e) {
            if (state.currentKey !== key) return;
            commit('SET_ERROR', e);
          } finally {
            // 历史已处理完，进入建连阶段；带 key 守卫避免覆盖新会话的状态
            if (state.currentKey === key) commit('SET_CONNECTION', AppConnectionState.CONNECTING);
          }
        }

        if (state.currentKey !== key) return;

        for await (const event of sessionApi.streamEvents(sessionId, agentId, controller.signal, () => {
          if (state.currentKey !== key) return;
          commit('SET_CONNECTION', AppConnectionState.READY);
          // 订阅已建立，此时才能安全触发首条消息，否则回复事件会丢
          if (pending && pending.key === key) dispatch('send', pending.content);
        })) {
          if (state.currentKey !== key) break;
          dispatch('processEvent', { event, callbacks });
        }
      } catch (e) {
        if (state.currentKey !== key) return;
        // 建连失败：回落到 idle，避免卡在 connecting 导致加载态不消失
        commit('SET_CONNECTION', AppConnectionState.IDLE);
        if (e?.name !== 'AbortError') {
          commit('SET_ERROR', e);
        }
      } finally {
        if (state.abortController === controller) {
          commit('SET_ABORT_CONTROLLER', null);
        }
      }
    },

    /**
     * 关闭当前会话，中止 SSE。
     */
    closeConversation({ commit }) {
      commit('RESET');
    },

    /**
     * 标记「正在创建会话」，覆盖创建 HTTP 往返期间的状态：
     * 此时路由还没切到新会话，openConversation 尚未被触发。
     */
    startCreating({ commit }) {
      commit('SET_CONNECTION', AppConnectionState.CREATING);
    },

    /**
     * 结束创建会话。仅在仍处于 CREATING 时回落，避免覆盖已由
     * openConversation 接管的状态。
     */
    endCreating({ state, commit }) {
      if (state.connection === AppConnectionState.CREATING) {
        commit('SET_CONNECTION', AppConnectionState.IDLE);
      }
    },

    /**
     * 暂存新建会话的首条消息，待该会话 SSE 就绪后由 openConversation 补发。
     * 视图侧只负责「建会话 → 暂存 → 跳转」，不需要再自己等待时序。
     *
     * @param {object} ctx
     * @param {{ agentId: string, sessionId: string, content: object[] }} payload
     */
    stageInput({ commit }, { agentId, sessionId, content }) {
      commit('SET_PENDING_INPUT', { key: `${agentId}:${sessionId}`, content });
    },

    /**
     * 丢弃暂存的首条消息。会话已创建但没能打开（跳转失败/被打断）时调用，
     * 否则该消息会悬空到下一次 openConversation 被 RESET 静默清掉。
     *
     * @param {object} ctx
     * @returns {boolean} 是否确实丢弃了暂存消息。
     */
    discardPendingInput({ state, commit }) {
      if (!state.pendingInput) return false;
      commit('SET_PENDING_INPUT', null);
      return true;
    },

    /**
     * 处理单个 AgentEvent。
     *
     * 分发规则：`EventType` 取值来自 SDK；`EventType.CUSTOM` 下的 `name` 是后端约定
     * （见 BackendCustomEventName），SDK 只负责把它作为 CustomEvent 传过来。
     *
     * @param {object} ctx
     * @param {{ event: import('@agentscope-ai/agentscope/event').AgentEvent, callbacks?: object }} payload
     */
    processEvent({ commit, state }, { event, callbacks = {} }) {
      if (event.type === EventType.CUSTOM) {
        const custom = event;
        if (custom.name === BackendCustomEventName.TEAM_UPDATED) {
          callbacks.onTeamUpdated?.();
        } else if (custom.name === BackendCustomEventName.STATE_UPDATED && custom.value) {
          callbacks.onStateUpdated?.(custom.value);
        } else if (custom.name === BackendCustomEventName.SESSION_UPDATED) {
          callbacks.onSessionUpdated?.();
        } else if (custom.name === BackendCustomEventName.SUBAGENT_REQUIRE_USER_CONFIRM) {
          const e = custom.value;
          commit('SET_SUBAGENT_HITL', [...state.subagentHitl.filter((x) => hitlKey(x) !== hitlKey(e)), e]);
        } else if (custom.name === BackendCustomEventName.SUBAGENT_USER_CONFIRM_RESULT) {
          const v = custom.value;
          commit(
            'SET_SUBAGENT_HITL',
            state.subagentHitl.filter((x) => hitlKey(x) !== hitlKey(v)),
          );
        }
        return;
      }

      if (event.type === EventType.REPLY_START) {
        const existing = state.messages.find((m) => m.id === event.reply_id);
        if (existing) {
          commit('SET_CURRENT_REPLY_ID', event.reply_id);
        } else {
          // 新一轮回复开始，停止上一轮的实时音频播放
          callbacks.onAudioStopAll?.();
          const msg = AssistantMsg({ id: event.reply_id, name: event.name, content: [] });
          commit('SET_MESSAGES', [...state.messages, msg]);
          commit('SET_CURRENT_REPLY_ID', event.reply_id);
        }
        commit('CLEAR_INTERRUPT_TIMER');
        commit('SET_PHASE', AppReplyPhase.STREAMING);
      } else {
        const replyId = state.currentReplyId;
        if (replyId) {
          const nextMessages = replaceMessage(state.messages, replyId, (reply) => {
            appendEvent(reply, event);
            return { ...reply, content: reply.content.slice() };
          });
          commit('SET_MESSAGES', nextMessages);
        }
        if (event.type === EventType.REPLY_END) {
          commit('CLEAR_INTERRUPT_TIMER');
          commit('SET_PHASE', AppReplyPhase.IDLE);
          commit('SET_CURRENT_REPLY_ID', null);
        }
      }

      // 音频 DataBlock 路由到音频管理器（L2 provide/inject）。
      // appendEvent 仍会把字节累积到 Msg.source.data，MessageBubble
      // 读取管理器的播放状态以显示进度和自动播放。
      if (event.type === EventType.DATA_BLOCK_START) {
        if (event.media_type?.startsWith('audio/')) {
          callbacks.onAudioStart?.(event.block_id, event.media_type);
        }
      } else if (event.type === EventType.DATA_BLOCK_DELTA) {
        if (event.media_type?.startsWith('audio/')) {
          callbacks.onAudioAppend?.(event.block_id, event.data);
        }
      } else if (event.type === EventType.DATA_BLOCK_END) {
        callbacks.onAudioEnd?.(event.block_id);
      }
    },

    /**
     * 发送用户消息。
     * @param {object} ctx
     * @param {import('@agentscope-ai/agentscope/message').ContentBlock[]} contentBlocks
     */
    async send({ commit, state }, contentBlocks) {
      const [agentId, sessionId] = (state.currentKey || '').split(':');
      if (!agentId || !sessionId) return;

      // name 是展示名（Msg.name）；role 由 SDK 的 UserMsg 内部置为 'user'
      const userMsg = UserMsg({ name: 'user', content: contentBlocks });
      commit('SET_MESSAGES', [...state.messages, userMsg]);

      // 消息已上屏即视为本轮回复进行中，立即进入 streaming（输入框转为停止按钮）。
      // 发送与 SSE 是两条独立流，无需等 REPLY_START；REPLY_END 到达后回到 idle。
      commit('SET_PHASE', AppReplyPhase.STREAMING);
      commit('SET_ERROR', null);

      try {
        const { chatApi } = await import('@/api');
        await chatApi.trigger({
          agent_id: agentId,
          session_id: sessionId,
          input: userMsg,
        });
      } catch (e) {
        // 触发失败：消息实际未送达。回退状态，并在该条消息上标记失败供用户感知。
        commit('SET_PHASE', AppReplyPhase.IDLE);
        commit('SET_ERROR', e);
        commit(
          'SET_MESSAGES',
          replaceMessage(state.messages, userMsg.id, (msg) => ({
            ...msg,
            error: e,
          })),
        );
      }
    },

    /**
     * 确认/拒绝工具调用（HITL）。
     * @param {object} ctx
     * @param {{ toolCall: object, confirm: boolean, rules?: object[] }} payload
     */
    async confirm({ commit, state }, { toolCall, confirm, rules }) {
      const [agentId, sessionId] = (state.currentKey || '').split(':');
      if (!agentId || !sessionId) return;

      const replyId = state.currentReplyId || state.messages[state.messages.length - 1]?.id;
      if (!replyId) return;

      commit('SET_CURRENT_REPLY_ID', replyId);

      const event = {
        type: EventType.USER_CONFIRM_RESULT,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        reply_id: replyId,
        confirm_results: [{ confirmed: confirm, tool_call: toolCall, rules: rules ?? null }],
      };

      commit('SET_ERROR', null);

      try {
        const { chatApi } = await import('@/api');
        await chatApi.trigger({
          agent_id: agentId,
          session_id: sessionId,
          input: event,
        });
      } catch (e) {
        commit('SET_ERROR', e);
        throw e;
      }
    },

    /**
     * 回答 AskUser 工具调用（外部执行 HITL）。
     * 构造 ExternalExecutionResultEvent 并通过 chatApi 回传，会话随即恢复。
     * @param {object} ctx
     * @param {{ toolCall: object, replyId: string, answers: object[] }} payload
     */
    async askUserSubmit({ commit, state }, { toolCall, replyId, answers }) {
      const [agentId, sessionId] = (state.currentKey || '').split(':');
      if (!agentId || !sessionId) return;

      const targetReplyId = replyId || state.currentReplyId || state.messages[state.messages.length - 1]?.id;
      if (!targetReplyId) return;

      // 恢复 currentReplyId，让续写事件（无 REPLY_START）有目标可落到
      commit('SET_CURRENT_REPLY_ID', targetReplyId);

      // 面向模型的可读输出
      const output = answers
        .map((a) => {
          const picked = a.other ? [...a.selected, a.other] : a.selected;
          return `Q: ${a.question}\nA: ${picked.join(', ')}`;
        })
        .join('\n\n');

      const now = new Date().toISOString();
      const event = {
        type: EventType.EXTERNAL_EXECUTION_RESULT,
        id: crypto.randomUUID(),
        created_at: now,
        reply_id: targetReplyId,
        execution_results: [
          {
            type: SdkBlockType.TOOL_RESULT,
            id: toolCall.id,
            name: toolCall.name,
            output,
            state: SdkToolResultState.SUCCESS,
            metadata: { answers },
            created_at: now,
            finished_at: now,
          },
        ],
      };

      commit('SET_ERROR', null);

      try {
        const { chatApi } = await import('@/api');
        await chatApi.trigger({
          agent_id: agentId,
          session_id: sessionId,
          input: event,
        });
      } catch (e) {
        commit('SET_ERROR', e);
        throw e;
      }
    },

    /**
     * 确认/拒绝子代理 HITL。
     * @param {object} ctx
     * @param {{ entry: object, toolCall: object, confirm: boolean, rules?: object[] }} payload
     */
    async subagentConfirm({ commit, state }, { entry, toolCall, confirm, rules }) {
      const [agentId, sessionId] = (state.currentKey || '').split(':');
      if (!agentId || !sessionId) return;

      const event = {
        type: EventType.USER_CONFIRM_RESULT,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        reply_id: entry.reply_id,
        confirm_results: [{ confirmed: confirm, tool_call: toolCall, rules: rules ?? null }],
      };

      commit('SET_ERROR', null);

      try {
        const { chatApi } = await import('@/api');
        await chatApi.trigger({
          agent_id: agentId,
          session_id: sessionId,
          input: event,
        });
      } catch (e) {
        commit('SET_ERROR', e);
        throw e;
      }

      commit(
        'SET_SUBAGENT_HITL',
        state.subagentHitl.flatMap((x) => {
          if (hitlKey(x) !== hitlKey(entry)) return [x];
          const remaining = (x.event.tool_calls || []).filter((tc) => tc.id !== toolCall.id);
          return remaining.length > 0 ? [{ ...x, event: { ...x.event, tool_calls: remaining } }] : [];
        }),
      );
    },

    /**
     * 回答子代理的 AskUser 工具调用（外部执行 HITL）。
     * 与 confirm 类似，事件发到 leader 前门，后端按 worker 的 reply_id 转发；
     * 区别是回传 ExternalExecutionResultEvent 而非 UserConfirmResultEvent。
     * @param {object} ctx
     * @param {{ entry: object, toolCall: object, answers: object[] }} payload
     */
    async subagentAskUserSubmit({ commit, state }, { entry, toolCall, answers }) {
      const [agentId, sessionId] = (state.currentKey || '').split(':');
      if (!agentId || !sessionId) return;

      // 面向模型的可读输出
      const output = answers
        .map((a) => {
          const picked = a.other ? [...a.selected, a.other] : a.selected;
          return `Q: ${a.question}\nA: ${picked.join(', ')}`;
        })
        .join('\n\n');

      const now = new Date().toISOString();
      const event = {
        type: EventType.EXTERNAL_EXECUTION_RESULT,
        id: crypto.randomUUID(),
        created_at: now,
        reply_id: entry.reply_id, // worker 的 reply_id；后端据此转发
        execution_results: [
          {
            type: SdkBlockType.TOOL_RESULT,
            id: toolCall.id,
            name: toolCall.name,
            output,
            state: SdkToolResultState.SUCCESS,
            metadata: { answers },
            created_at: now,
            finished_at: now,
          },
        ],
      };

      commit('SET_ERROR', null);

      try {
        const { chatApi } = await import('@/api');
        await chatApi.trigger({
          agent_id: agentId,
          session_id: sessionId,
          input: event,
        });
      } catch (e) {
        commit('SET_ERROR', e);
        throw e;
      }

      // 只移除刚回答的那个调用；entry 可能还挂着其它待办调用
      commit(
        'SET_SUBAGENT_HITL',
        state.subagentHitl.flatMap((x) => {
          if (hitlKey(x) !== hitlKey(entry)) return [x];
          const remaining = (x.event.tool_calls || []).filter((tc) => tc.id !== toolCall.id);
          return remaining.length > 0 ? [{ ...x, event: { ...x.event, tool_calls: remaining } }] : [];
        }),
      );
    },

    /**
     * 请求中断当前回复。
     */
    async interrupt({ commit, state }) {
      const [agentId, sessionId] = (state.currentKey || '').split(':');
      if (!agentId || !sessionId) return;

      commit('SET_ERROR', null);

      if (state.phase === AppReplyPhase.STREAMING) {
        commit('SET_PHASE', AppReplyPhase.INTERRUPTING);
      }
      commit('CLEAR_INTERRUPT_TIMER');
      const timer = setTimeout(() => {
        if (state.phase === AppReplyPhase.INTERRUPTING) {
          commit('SET_PHASE', AppReplyPhase.IDLE);
        }
      }, INTERRUPT_TIMEOUT_MS);
      commit('SET_INTERRUPT_TIMER', timer);

      try {
        const { sessionApi } = await import('@/api');
        await sessionApi.interrupt(sessionId, agentId);
      } catch (e) {
        commit('CLEAR_INTERRUPT_TIMER');
        if (state.phase === AppReplyPhase.INTERRUPTING) {
          commit('SET_PHASE', AppReplyPhase.IDLE);
        }
        commit('SET_ERROR', e);
      }
    },
  },

  getters: {
    /** 当前会话是否属于该 key（本应用自定义：key 由 URL Query 派生）。 */
    ownsConversation: (state) => (key) => state.currentKey === key,
    lastMessage: (state) => state.messages[state.messages.length - 1] || null,
    /** 会话尚未可用（创建/拉历史/建连中），供 UI 展示加载态；由本应用自定义的 connection 派生。 */
    preparing: (state) =>
      state.connection === AppConnectionState.CREATING ||
      state.connection === AppConnectionState.LOADING ||
      state.connection === AppConnectionState.CONNECTING,
  },
};
