/**
 * 助手表单的分段与默认值工具。
 *
 * 后端返回的是扁平的 `AgentData` JSON Schema：顶层既有标量 / 布尔 / 文本
 * 字段，也有 `context_config`、`react_config`、`invite_config` 三个对象字段。
 * 表单按后者的键把它们切成四段渲染。
 */
export const AGENT_SECTIONS = ['identity', 'context_config', 'react_config', 'invite_config'];

const NESTED_SECTIONS = ['context_config', 'react_config', 'invite_config'];

/** 分段标题；React 侧走 i18n，这里直接给中文。 */
export const SECTION_LABELS = {
  identity: '身份',
  context_config: '上下文配置',
  react_config: 'ReAct 配置',
  invite_config: '邀请配置',
};

const toKebab = (key) => key.replace(/_/g, '-');

/**
 * 字段级中文文案。后端 schema 的 `title` / `description` 都是英文，
 * 这里按「分段 + kebab 后的字段名」映射；未收录的字段回落到 schema 原值，
 * 以便后端新增字段时不至于渲染空白。
 */
const FIELD_LABELS = {
  identity: {
    name: '名称',
    'system-prompt': '系统提示词',
  },
  context_config: {
    'trigger-ratio': '触发比例',
    'reserve-ratio': '保留比例',
    'context-buffer-ratio': '上下文缓冲比例',
    'compression-prompt': '压缩提示词',
    'summary-template': '摘要模板',
    'tool-result-limit': '工具结果限制',
    'compression-fallback-to-truncation': '压缩失败回退到截断',
    'compression-tool-enabled': '启用压缩工具',
    'max-image-num': '最大图片数',
  },
  react_config: {
    'max-iters': '最大迭代次数',
    'structured-output-grace-iters': '结构化输出宽限轮数',
    'stop-on-reject': '拒绝时停止',
    'interruption-message': '中断回复',
    'interruption-raise-cancelled-error': '抛出 CancelledError',
  },
  invite_config: {
    invitable: '允许被邀请',
    'invite-description': '邀请说明',
  },
};

const FIELD_PLACEHOLDERS = {
  identity: {
    name: '我的智能体',
    'system-prompt': '定义助手的角色和行为',
  },
  context_config: {
    'trigger-ratio': '上下文占用达到该比例时触发压缩',
    'reserve-ratio': '压缩后保留的上下文比例',
    'context-buffer-ratio': '距触发阈值的提前量，需小于触发比例',
    'compression-prompt': '生成压缩摘要时使用的提示词',
    'summary-template': '压缩摘要正文的模板',
    'tool-result-limit': '工具结果的 token 上限，超出部分将被截断',
    'compression-fallback-to-truncation': '摘要生成失败时，是否改为截断最早的上下文',
    'compression-tool-enabled': '是否向助手暴露上下文压缩工具',
    'max-image-num': '上下文中保留的最大图片数',
  },
  react_config: {
    'max-iters': '单次回复中推理-行动循环的最大轮数',
    'structured-output-grace-iters': '超过最大迭代次数后，为结构化输出额外放宽的轮数',
    'stop-on-reject': '执行工具被拒绝时是否停止回复',
    'interruption-message': '被中断时使用的快速回复内容',
    'interruption-raise-cancelled-error': '处理后是否重新抛出 asyncio.CancelledError',
  },
  invite_config: {
    invitable: '是否允许此智能体通过 AgentInvite 被借调',
    'invite-description': '简要描述此智能体的专长；允许被邀请时必填。',
  },
};

const FIELD_DESCRIPTIONS = {
  react_config: {
    'structured-output-grace-iters': '超过最大迭代次数后额外允许的轮数，让已经到达上限的回复仍能产出要求的结构化输出。',
    'interruption-message': '用户中断回复时，智能体给出的回复内容。',
    'interruption-raise-cancelled-error': '处理完中断后重新抛出 asyncio.CancelledError，而不是将其吞掉。',
  },
};

/** 字段中文名；未收录时回落 schema 的 `title`。 */
export function agentFieldLabel(section, key, prop) {
  return FIELD_LABELS[section]?.[toKebab(key)] ?? prop.title ?? toKebab(key).replace(/-/g, ' ');
}

/** 字段中文占位符；未收录时回落 schema 的 `description`。 */
export function agentFieldPlaceholder(section, key, prop) {
  return FIELD_PLACEHOLDERS[section]?.[toKebab(key)] ?? prop.description;
}

/** 字段辅助说明；仅对标签无法自解释的字段提供。 */
export function agentFieldDescription(section, key) {
  return FIELD_DESCRIPTIONS[section]?.[toKebab(key)];
}

/** 把扁平的 `AgentData` schema 切成表单渲染的四段。 */
export function sliceAgentSchema(root) {
  const props = (root && root.properties) || {};
  const nested = new Set(NESTED_SECTIONS);

  const identityProps = {};
  for (const [key, prop] of Object.entries(props)) {
    if (nested.has(key)) continue;
    identityProps[key] = prop;
  }

  const sections = {
    identity: {
      type: 'object',
      title: 'Identity',
      properties: identityProps,
      required: root && root.required ? root.required.filter((r) => !nested.has(r)) : [],
    },
  };
  for (const key of NESTED_SECTIONS) {
    sections[key] = props[key] || { type: 'object', properties: {} };
  }
  return sections;
}

function valuesFromDefaults(section) {
  const out = {};
  for (const [key, prop] of Object.entries(section.properties || {})) {
    if (prop.const !== undefined) continue;
    if (prop.default !== undefined) out[key] = prop.default;
  }
  return out;
}

/** 依据各段 schema 的 `default` 生成一份全新的表单值。 */
export function defaultAgentFormValues(schema) {
  const sections = sliceAgentSchema(schema);
  return {
    identity: valuesFromDefaults(sections.identity),
    context_config: valuesFromDefaults(sections.context_config),
    react_config: valuesFromDefaults(sections.react_config),
    invite_config: valuesFromDefaults(sections.invite_config),
  };
}
