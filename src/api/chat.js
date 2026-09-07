/**
 * Chat API（去 TS 版，迁移自 src/api/chat.ts）。
 * 事件通过 SSE 流返回，不在 POST 响应中。
 */
import { client } from './client';

export const chatApi = {
  trigger: (body, options) => client.post('/chat/', body, undefined, options),
};
