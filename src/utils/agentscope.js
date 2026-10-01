import Vue from 'vue';
import { appendEvent } from '@agentscope-ai/agentscope/message';

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
      Vue.set(block, snapshot[i][0], snapshot[i][1]);
    }
  }

  return msg;
}
