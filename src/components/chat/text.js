/**
 * Chat 页面中文文案。
 */
export const TEXT = {
  errorTitle: '回复出错',
  errorUnknown: '未知错误',
  thinking: '思考中',
  thinkingFor: (duration) => `思考中 ${duration}`,
  copy: '复制',
  running: '运行中',
  confirmToolCall: '确认执行该工具调用？',
  yes: '是',
  no: '否',
  yesWithRule: (toolName, ruleContent) => `总是允许 ${toolName}: ${ruleContent}`,
  toConfirm: '确认',
  subagentConfirmTitle: (name) => `${name} 请求确认`,
  inputPlaceholder: '输入消息...',
  send: '发送',
  stop: '停止',
  stopping: '停止中',
  attach: '附件',
  attachNotSupported: '当前模型不支持附件',
  toComplete: '补全',
  greeting: '有什么可以帮你的？',
  maxItersExceeded: {
    title: '达到最大迭代次数',
    description: '本轮回复已达到最大迭代次数限制。',
    continue: '继续',
  },
};
