/**
 * Sessions API：会话列表 / 创建 / 消息流式读取。
 */
import { client } from './client';

/**
 * 新建会话的一次性标记集合。
 *
 * 设计意图：刚通过 `session.create` 创建出来的会话，立即打开时无需调用
 * `session.messages` 拉取历史——因为紧接着会 `POST /chat/` 触发 SSE 流，
 * 首次消息会通过事件流到达，先拉历史会和 POST 抢资源，造成首条消息丢失/重复。
 * 这里用一个 Set 做"消费即失效"的一次性开关，由打开会话的逻辑读取并清除。
 */
const freshlyCreated = new Set();

/**
 * 检查并消费"刚创建"标记。
 * @returns {boolean} 若该 sessionId 刚被创建过则返回 true（同时从集合中移除），否则返回 false。
 */
export function takeFreshlyCreated(sessionId) {
  return freshlyCreated.delete(sessionId);
}

/**
 * 把 sessionId 标记为"刚创建"，供后续打开时跳过历史消息拉取。
 */
export function markFreshlyCreated(sessionId) {
  freshlyCreated.add(sessionId);
}

export const sessionApi = {
  list: (agentId) => client.request('session.list', { params: { agent_id: agentId } }),

  create: async (body) => {
    const res = await client.request('session.create', { body });
    // 标记为"刚创建"，下次打开时跳过历史拉取，避免与紧随其后的 POST /chat/ 抢 SSE 流。
    markFreshlyCreated(res.session_id);
    return res;
  },

  update: (sessionId, agentId, body, options) =>
    client.request('session.update', {
      pathParams: { sessionId },
      params: { agent_id: agentId },
      body,
      ...options,
    }),

  remove: (sessionId, agentId) =>
    client.request('session.remove', {
      pathParams: { sessionId },
      params: { agent_id: agentId },
    }),

  interrupt: (sessionId, agentId) =>
    client.request('session.interrupt', {
      pathParams: { sessionId },
      params: { agent_id: agentId },
      body: null,
    }),

  messages: (sessionId, agentId, params) =>
    client.request('session.messages', {
      pathParams: { sessionId },
      params: {
        agent_id: agentId,
        ...(params?.before != null && { before: params.before }),
        ...(params?.limit != null && { limit: String(params.limit) }),
      },
    }),

  /**
   * 订阅会话的 SSE 实时事件流。
   * @param {string} sessionId
   * @param {string} agentId
   * @param {AbortSignal} [signal]
   * @param {() => void} [onReady] 连接建立后（响应头到达）回调
   * @returns {AsyncGenerator<import('@agentscope-ai/agentscope/event').AgentEvent>}
   */
  streamEvents: async function* (sessionId, agentId, signal, onReady) {
    const res = await client.request('session.streamEvents', {
      pathParams: { sessionId },
      params: { agent_id: agentId },
      stream: true,
      signal,
    });
    onReady?.();

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (line.startsWith('data:')) {
            const json = line.slice(5).trim();
            if (json) yield JSON.parse(json);
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  },
};
