import { SdkMessageRole } from '@/constants/protocol';

/**
 * 会话导出的段落分组逻辑（纯函数，供 ExportWordButton 等导出组件复用）。
 *
 * 角色标签、「用户纯文本 / 助手 Markdown」这类会话导出语义放在这里，
 * `utils/word.js` 仍只负责「label/format → Word 元素」，不感知消息角色。
 */

// 角色 → 中文标签；未知角色兜底为「助手」
const ROLE_LABELS = {
  [SdkMessageRole.USER]: '用户',
  [SdkMessageRole.ASSISTANT]: '助手',
  system: '系统',
};

/**
 * 提取一条消息里的纯文本。
 *
 * `Msg.content` 既有 `ContentBlock[]`（SDK `createMsg` 归一化后），
 * 也可能以纯字符串形态出现（`createMsg` 入参、后端回放的原始数据），
 * 这里统一成 text 块后再拼接；thinking / tool_call / tool_result / data / hint
 * 等非文本块不进文档。
 *
 * @param {string|Array|undefined} content 消息内容。
 * @returns {string} 拼接后的纯文本，无内容时为空串。
 */
export function messageText(content) {
  const blocks =
    typeof content === 'string' ? [{ type: 'text', text: content }] : Array.isArray(content) ? content : [];
  return blocks
    .filter((block) => block && block.type === 'text' && block.text)
    .map((block) => block.text)
    .join('\n\n')
    .trim();
}

/**
 * 把 SDK 消息列表转成「连续同角色合并」的段落分组。
 *
 * @param {Array} msgs SDK Msg 列表（history）。
 * @returns {{label: string, content: string, format: 'text'|'markdown'}[]}
 *   label 为角色标签；用户文本按纯文本导出（保留原始换行），
 *   其余按 Markdown 富文本导出。
 */
export function buildExportSections(msgs) {
  const result = [];
  for (const msg of msgs || []) {
    const text = messageText(msg?.content);
    if (!text) continue;

    const label = ROLE_LABELS[msg?.role] || '助手';
    const last = result[result.length - 1];
    if (last && last.label === label) {
      last.content += `\n\n${text}`;
      continue;
    }
    result.push({ label, content: text, format: msg?.role === SdkMessageRole.USER ? 'text' : 'markdown' });
  }
  return result;
}
