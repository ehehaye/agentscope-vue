import { set } from '@/composables/vue';
import { appendEvent } from '@agentscope-ai/agentscope/message';
import { SdkBlockType, SdkMessageRole, SdkToolCallState } from '@/constants/protocol';

/**
 * 包装 SDK 的 appendEvent：暴力把 msg.content 下每个 block 的所有 ownKeys
 * 重新走 Vue.set 登记，让任何"已存在的 key 但没 setter 的延后赋值"也具备响应式。
 *
 * 实现：appendEvent 跑完之后，遍历 msg.content 每个 block，对每个 own key
 *       先 delete 再 Vue.set。delete 让 Vue.set 走"新 key"分支（defineReactive），
 *       强制 Vue 2 重新装 reactive getter/setter。
 *
 * 适用范围：THINKING/TEXT/DATA/TOOL_CALL/TOOL_RESULT_*_END 给 block 补 finished_at；
 *           REQUIRE_USER_CONFIRM 给 tool_call 补 suggested_rules；
 *           TOOL_RESULT_END 给 tool_result 补 state/metadata/finished_at 等延后字段；
 *           以及 SDK 未来新增的任何延后赋值字段，无需枚举、无需 diff。
 */
export function appendEventReactive(msg, event) {
  appendEvent(msg, event);

  for (const block of msg.content) {
    if (!block || typeof block !== 'object') continue;
    const keys = Object.keys(block);
    const snapshot = keys.map((k) => [k, block[k]]);
    for (let i = 0; i < keys.length; i++) delete block[keys[i]];
    for (let i = 0; i < snapshot.length; i++) {
      set(block, snapshot[i][0], snapshot[i][1]);
    }
  }

  return msg;
}

/**
 * 按 tool_call_id 从消息块反查工具名与调用/结果块。
 * TOOL_RESULT_END 事件本身不带 `tool_call_name`，input / output 也只存在于消息块上。
 * @param {object[]} messages 当前会话的 `Msg[]`
 * @param {string} replyId 事件里的 `reply_id`，用于定位消息
 * @param {string} toolCallId 事件里的 `tool_call_id`
 * @returns {{ name: string|null, input: string|null, output: object[]|string|null }}
 */
export function findToolBlocks(messages, replyId, toolCallId) {
  const reply = messages.find((m) => m.id === replyId);
  if (!reply) return { name: null, input: null, output: null };
  const call = reply.content.find((b) => b.type === SdkBlockType.TOOL_CALL && b.id === toolCallId);
  const result = reply.content.find((b) => b.type === SdkBlockType.TOOL_RESULT && b.id === toolCallId);
  return {
    name: call?.name ?? result?.name ?? null,
    input: call?.input ?? null,
    output: result?.output ?? null,
  };
}

/** 末尾消息是否停在待用户处理的工具调用上（取值均为 SDK 定义的块类型 / 工具状态）。 */
export function hasPendingToolCall(msg) {
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

export function replaceMessage(messages, id, updater) {
  const idx = messages.findIndex((m) => m.id === id);
  if (idx === -1) return messages;
  const next = updater(messages[idx]);
  const copy = messages.slice();
  copy[idx] = next;
  return copy;
}
