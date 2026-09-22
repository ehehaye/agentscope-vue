/**
 * Sessions API：会话列表 / 创建 / 消息流式读取。
 */
import { client } from './client';

const freshlyCreated = new Set();

export function takeFreshlyCreated(sessionId) {
  return freshlyCreated.delete(sessionId);
}

export function markFreshlyCreated(sessionId) {
  freshlyCreated.add(sessionId);
}

export const sessionApi = {
  list: (agentId) =>
    client.request('session.list', { params: { agent_id: agentId } }),

  create: async (body) => {
    const res = await client.request('session.create', { body });
    freshlyCreated.add(res.session_id);
    return res;
  },

  update: (sessionId, agentId, body, options) =>
    client.request('session.update', {
      pathParams: { sessionId },
      params: { agent_id: agentId },
      body,
      ...options,
    }),

  delete: (sessionId, agentId) =>
    client.request('session.delete', {
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
          if (line.startsWith('data: ')) {
            const json = line.slice(6).trim();
            if (json) yield JSON.parse(json);
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  },
};
