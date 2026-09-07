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
  list: (agentId) => client.get('/sessions/', { agent_id: agentId }),

  create: async (body) => {
    const res = await client.post('/sessions/', body);
    freshlyCreated.add(res.session_id);
    return res;
  },

  update: (sessionId, agentId, body, options) =>
    client.patch(`/sessions/${sessionId}`, body, { agent_id: agentId }, options),

  delete: (sessionId, agentId) =>
    client.delete(`/sessions/${sessionId}`, { agent_id: agentId }),

  interrupt: (sessionId, agentId) =>
    client.post(`/sessions/${sessionId}/interrupt`, null, { agent_id: agentId }),

  messages: (sessionId, agentId, params) =>
    client.get(`/sessions/${sessionId}/messages`, {
      agent_id: agentId,
      ...(params?.before != null && { before: params.before }),
      ...(params?.limit != null && { limit: String(params.limit) }),
    }),

  /**
   * 订阅会话的 SSE 实时事件流。
   * @param {string} sessionId
   * @param {string} agentId
   * @param {AbortSignal} [signal]
   * @returns {AsyncGenerator<import('@agentscope-ai/agentscope/event').AgentEvent>}
   */
  streamEvents: async function* (sessionId, agentId, signal) {
    const res = await client.stream(`/sessions/${sessionId}/stream`, {
      method: 'GET',
      params: { agent_id: agentId },
      signal,
    });

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
