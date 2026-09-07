/**
 * Vuex chat 模块。
 * 职责：管理当前会话的消息列表、回复阶段、HITL 状态。
 * SSE 连接生命周期由 useMessages 持有，本模块只负责纯状态变更。
 */
import { EventType } from '@agentscope-ai/agentscope/event';
import { appendEvent, AssistantMsg, UserMsg } from '@agentscope-ai/agentscope/message';

export const ReplyPhase = {
  IDLE: 'idle',
  STREAMING: 'streaming',
  INTERRUPTING: 'interrupting',
};

const INTERRUPT_TIMEOUT_MS = 10000;

function hasPendingToolCall(msg) {
  if (!msg || msg.role !== 'assistant') return false;
  for (const block of msg.content) {
    if (block.type !== 'tool_call') continue;
    if (block.state === 'asking' || block.state === 'submitted') return true;
  }
  return false;
}

function hitlKey(e) {
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
    messages: [],
    phase: ReplyPhase.IDLE,
    loading: false,
    error: null,
    currentKey: null,
    subagentHitl: [],
    currentReplyId: null,
    /** @type {AbortController|null} */
    abortController: null,
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
    SET_LOADING(state, loading) {
      state.loading = loading;
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
      state.phase = ReplyPhase.IDLE;
      state.loading = false;
      state.error = null;
      state.currentKey = null;
      state.subagentHitl = [];
      state.currentReplyId = null;
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
    async openConversation(
      { commit, state, dispatch },
      { agentId, sessionId, callbacks = {} },
    ) {
      const key = agentId && sessionId ? `${agentId}:${sessionId}` : null;
      // 清理旧连接与状态
      commit('RESET');
      commit('SET_KEY', key);
      if (!key) return;

      commit('SET_LOADING', true);
      const controller = new AbortController();
      commit('SET_ABORT_CONTROLLER', controller);

      try {
        const { sessionApi, takeFreshlyCreated } = await import('@/api');

        if (takeFreshlyCreated(sessionId)) {
          commit('SET_LOADING', false);
        } else {
          try {
            const { messages, is_running: isRunning } = await sessionApi.messages(
              sessionId,
              agentId,
            );
            if (state.currentKey !== key) return;
            commit('SET_MESSAGES', messages || []);
            const tail = messages && messages.length > 0 ? messages[messages.length - 1] : null;
            if (isRunning || hasPendingToolCall(tail)) {
              commit('SET_PHASE', ReplyPhase.STREAMING);
              if (hasPendingToolCall(tail)) {
                commit('SET_CURRENT_REPLY_ID', tail.id);
              }
            }
          } catch (e) {
            if (state.currentKey !== key) return;
            commit('SET_ERROR', e);
          } finally {
            commit('SET_LOADING', false);
          }
        }

        if (state.currentKey !== key) return;

        for await (const event of sessionApi.streamEvents(sessionId, agentId, controller.signal)) {
          if (state.currentKey !== key) break;
          dispatch('processEvent', { event, callbacks });
        }
      } catch (e) {
        if (state.currentKey !== key) return;
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
     * 处理单个 AgentEvent。
     * @param {object} ctx
     * @param {{ event: import('@agentscope-ai/agentscope/event').AgentEvent, callbacks?: object }} payload
     */
    processEvent({ commit, state }, { event, callbacks = {} }) {
      if (event.type === EventType.CUSTOM) {
        const custom = event;
        if (custom.name === 'team_updated') {
          callbacks.onTeamUpdated?.();
        } else if (custom.name === 'state_updated' && custom.value) {
          callbacks.onStateUpdated?.(custom.value);
        } else if (custom.name === 'session_updated') {
          callbacks.onSessionUpdated?.();
        } else if (custom.name === 'subagent_require_user_confirm') {
          const e = custom.value;
          commit(
            'SET_SUBAGENT_HITL',
            [...state.subagentHitl.filter((x) => hitlKey(x) !== hitlKey(e)), e],
          );
        } else if (custom.name === 'subagent_user_confirm_result') {
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
        commit('SET_PHASE', ReplyPhase.STREAMING);
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
          commit('SET_PHASE', ReplyPhase.IDLE);
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

      const userMsg = UserMsg({ name: 'user', content: contentBlocks });
      commit('SET_MESSAGES', [...state.messages, userMsg]);

      try {
        const { chatApi } = await import('@/api');
        await chatApi.trigger({
          agent_id: agentId,
          session_id: sessionId,
          input: userMsg,
        });
      } catch (e) {
        commit('SET_ERROR', e);
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
          return remaining.length > 0
            ? [{ ...x, event: { ...x.event, tool_calls: remaining } }]
            : [];
        }),
      );
    },

    /**
     * 请求中断当前回复。
     */
    async interrupt({ commit, state }) {
      const [agentId, sessionId] = (state.currentKey || '').split(':');
      if (!agentId || !sessionId) return;

      if (state.phase === ReplyPhase.STREAMING) {
        commit('SET_PHASE', ReplyPhase.INTERRUPTING);
      }
      commit('CLEAR_INTERRUPT_TIMER');
      const timer = setTimeout(() => {
        if (state.phase === ReplyPhase.INTERRUPTING) {
          commit('SET_PHASE', ReplyPhase.IDLE);
        }
      }, INTERRUPT_TIMEOUT_MS);
      commit('SET_INTERRUPT_TIMER', timer);

      try {
        const { sessionApi } = await import('@/api');
        await sessionApi.interrupt(sessionId, agentId);
      } catch (e) {
        commit('CLEAR_INTERRUPT_TIMER');
        if (state.phase === ReplyPhase.INTERRUPTING) {
          commit('SET_PHASE', ReplyPhase.IDLE);
        }
        commit('SET_ERROR', e);
      }
    },
  },

  getters: {
    ownsConversation: (state) => (key) => state.currentKey === key,
    lastMessage: (state) => state.messages[state.messages.length - 1] || null,
  },
};
