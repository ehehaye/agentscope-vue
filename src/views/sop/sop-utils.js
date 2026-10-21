/**
 * SOP 页面的纯函数工具：表单模型、校验、提交数据构造与运行记录解析。
 * 不依赖 Vue，便于单测（见 tests/unit/sop-utils.spec.js）。
 */

export const SOP_PHASE_LABELS = {
  pending: '等待开始',
  running: '运行中',
  awaiting: '待处理',
  completed: '已完成',
  failed: '已失败',
};

export const SOP_WORKSPACE_GRAIN_LABELS = {
  run: '整个运行共用一个工作区',
  per_session_key: '每个会话一个工作区',
};

/** 新建一个空步骤；agentId 用于给首个执行者一个默认值。 */
export function createEmptyStep(agentId = '') {
  return {
    subject: '',
    description: '',
    executor: { agent_id: agentId, session_key: '' },
    verifier: {
      type: 'none',
      agent: { agent_id: '', session_key: '' },
      criteria: '',
      question: '',
    },
    max_attempts: 3,
  };
}

/** 新建流程表单模型。 */
export function createEmptyForm(agentId = '') {
  return {
    name: '',
    description: '',
    workspace_grain: 'run',
    steps: [createEmptyStep(agentId)],
    session_settings: {},
  };
}

function normalizeFormVerifier(verifier) {
  if (!verifier) {
    return { type: 'none', agent: { agent_id: '', session_key: '' }, criteria: '', question: '' };
  }
  if (verifier.type === 'human') {
    return {
      type: 'human',
      agent: { agent_id: '', session_key: '' },
      criteria: '',
      question: verifier.question ?? '',
    };
  }
  if (verifier.type === 'agent') {
    return {
      type: 'agent',
      agent: {
        agent_id: verifier.agent?.agent_id ?? '',
        session_key: verifier.agent?.session_key ?? '',
      },
      criteria: verifier.criteria ?? '',
      question: '',
    };
  }
  return { type: 'none', agent: { agent_id: '', session_key: '' }, criteria: '', question: '' };
}

/** 把后端 SOPData 转成编辑表单模型。 */
export function formFromData(data) {
  const steps = (data?.steps ?? []).map((step) => ({
    subject: step.subject ?? '',
    description: step.description ?? '',
    executor: {
      agent_id: step.executor?.agent_id ?? '',
      session_key: step.executor?.session_key ?? '',
    },
    verifier: normalizeFormVerifier(step.verifier),
    max_attempts: step.max_attempts ?? 3,
  }));

  const sessionSettings = {};
  Object.entries(data?.session_settings ?? {}).forEach(([key, value]) => {
    sessionSettings[key] = {
      chat_model_config: value?.chat_model_config ?? null,
      fallback_chat_model_config: value?.fallback_chat_model_config ?? null,
      permission_mode: value?.permission_mode ?? 'default',
    };
  });

  return {
    name: data?.name ?? '',
    description: data?.description ?? '',
    workspace_grain: data?.workspace_grain ?? 'run',
    steps: steps.length > 0 ? steps : [createEmptyStep()],
    session_settings: sessionSettings,
  };
}

/**
 * 收集表单中实际使用的会话键。
 * @returns {{ session_key: string, agent_id: string, role: 'executor'|'verifier', step_index: number }[]}
 */
export function collectSessionRefs(form) {
  const refs = [];
  (form?.steps ?? []).forEach((step, index) => {
    const executorKey = step.executor?.session_key?.trim();
    if (executorKey) {
      refs.push({
        session_key: executorKey,
        agent_id: step.executor?.agent_id ?? '',
        role: 'executor',
        step_index: index,
      });
    }
    if (step.verifier?.type === 'agent') {
      const verifierKey = step.verifier.agent?.session_key?.trim();
      if (verifierKey) {
        refs.push({
          session_key: verifierKey,
          agent_id: step.verifier.agent?.agent_id ?? '',
          role: 'verifier',
          step_index: index,
        });
      }
    }
  });
  return refs;
}

/**
 * 校验表单，返回错误文案（多行）或 null。
 * 规则与后端创建/更新流程时的 422 校验保持一致。
 */
export function validateSopForm(form) {
  const errors = [];
  if (!form?.name?.trim()) errors.push('流程名称不能为空');

  const steps = form?.steps ?? [];
  if (steps.length === 0) errors.push('至少需要一个步骤');

  const keyAgents = new Map();
  function checkKeyOwner(key, agentId, label) {
    if (!agentId) return;
    const owner = keyAgents.get(key);
    if (owner && owner !== agentId) {
      errors.push(`会话键「${key}」同时被多个智能体使用（${label}）`);
      return;
    }
    if (!owner) keyAgents.set(key, agentId);
  }

  steps.forEach((step, index) => {
    const label = `第 ${index + 1} 步`;
    if (!step.subject?.trim()) errors.push(`${label}：步骤名称不能为空`);
    if (!step.description?.trim()) errors.push(`${label}：步骤说明不能为空`);
    if (!step.executor?.agent_id) errors.push(`${label}：请选择执行者`);

    const executorKey = step.executor?.session_key?.trim();
    if (!executorKey) {
      errors.push(`${label}：执行者会话键不能为空`);
    } else {
      checkKeyOwner(executorKey, step.executor?.agent_id, `${label}执行者`);
    }

    if (step.verifier?.type === 'agent') {
      const verifierAgentId = step.verifier.agent?.agent_id;
      const verifierKey = step.verifier.agent?.session_key?.trim();
      if (!verifierAgentId) errors.push(`${label}：请选择验证者`);
      if (!verifierKey) {
        errors.push(`${label}：验证者会话键不能为空`);
      } else {
        checkKeyOwner(verifierKey, verifierAgentId, `${label}验证者`);
      }
    } else if (step.verifier?.type === 'human') {
      if (!step.verifier.question?.trim()) errors.push(`${label}：请填写人工验收问题`);
    }

    const attempts = Number(step.max_attempts);
    if (!Number.isInteger(attempts) || attempts < 1) {
      errors.push(`${label}：最大尝试次数需为不小于 1 的整数`);
    }
  });

  const usedKeys = [...new Set(collectSessionRefs(form).map((ref) => ref.session_key))];
  usedKeys.forEach((key) => {
    const config = form.session_settings?.[key];
    if (!config?.chat_model_config?.credential_id || !config?.chat_model_config?.model) {
      errors.push(`会话键「${key}」未配置主模型`);
    }
  });

  return errors.length > 0 ? errors.join('\n') : null;
}

function normalizePayloadVerifier(verifier) {
  if (!verifier || verifier.type === 'none') return null;
  if (verifier.type === 'human') {
    return { type: 'human', question: verifier.question.trim() };
  }
  return {
    type: 'agent',
    agent: {
      agent_id: verifier.agent.agent_id,
      session_key: verifier.agent.session_key.trim(),
    },
    criteria: (verifier.criteria ?? '').trim(),
  };
}

/** 把表单模型构造成后端需要的 SOPData。 */
export function buildSopData(form) {
  const usedKeys = [...new Set(collectSessionRefs(form).map((ref) => ref.session_key))];
  const sessionSettings = {};
  usedKeys.forEach((key) => {
    const config = form.session_settings?.[key] ?? {};
    const setting = {
      chat_model_config: config.chat_model_config,
      permission_mode: config.permission_mode || 'default',
    };
    if (config.fallback_chat_model_config) {
      setting.fallback_chat_model_config = config.fallback_chat_model_config;
    }
    sessionSettings[key] = setting;
  });

  return {
    name: form.name.trim(),
    description: (form.description ?? '').trim(),
    workspace_grain: form.workspace_grain || 'run',
    steps: (form.steps ?? []).map((step) => ({
      subject: step.subject.trim(),
      description: step.description.trim(),
      executor: {
        agent_id: step.executor.agent_id,
        session_key: step.executor.session_key.trim(),
      },
      version: 'v1',
      verifier: normalizePayloadVerifier(step.verifier),
      max_attempts: Number(step.max_attempts) || 3,
    })),
    session_settings: sessionSettings,
  };
}

function sessionIdFor(run, sessionKey) {
  const value = run?.sessions?.[sessionKey];
  if (typeof value === 'string') return value;
  return value?.session_id ?? value?.id ?? null;
}

/**
 * 把运行定义中的会话键与 run.sessions 合并成展示用列表。
 * @returns {{ session_key: string, agent_id: string, session_id: string|null, roles: string[] }[]}
 */
export function collectRunSessions(run) {
  const byKey = new Map();

  function add(ref, role) {
    const key = ref?.session_key;
    if (!key) return;
    if (!byKey.has(key)) {
      byKey.set(key, {
        session_key: key,
        agent_id: ref.agent_id ?? '',
        session_id: sessionIdFor(run, key),
        roles: [],
      });
    }
    const entry = byKey.get(key);
    if (!entry.agent_id && ref.agent_id) entry.agent_id = ref.agent_id;
    if (!entry.roles.includes(role)) entry.roles.push(role);
  }

  (run?.definition?.steps ?? []).forEach((step) => {
    add(step.executor, '执行者');
    if (step.verifier?.type === 'agent') add(step.verifier.agent, '验证者');
  });

  return [...byKey.values()];
}

/** 返回当前等待人工验收的步骤下标；不是人工验收时返回 -1。 */
export function getAwaitingHumanStepIndex(run) {
  if (run?.state?.phase !== 'awaiting') return -1;
  const steps = run?.definition?.steps ?? [];
  const states = run?.state?.steps ?? [];
  for (let i = 0; i < steps.length; i++) {
    const submission = states[i]?.submission;
    const hasSubmission = Array.isArray(submission) ? submission.length > 0 : Boolean(submission);
    // 执行者尚未交付时，awaiting 更可能是等待工具授权，不能当成人工验收。
    if (steps[i]?.verifier?.type === 'human' && states[i]?.phase === 'awaiting' && hasSubmission) return i;
  }
  return -1;
}

/** 返回第一个未完成步骤下标，用于运行列表摘要。 */
export function getCurrentStepIndex(run) {
  const steps = run?.definition?.steps ?? [];
  const states = run?.state?.steps ?? [];
  for (let i = 0; i < steps.length; i++) {
    if (states[i]?.phase !== 'completed') return i;
  }
  return steps.length > 0 ? steps.length - 1 : -1;
}

/** 最后一个已开始的步骤下标；没有步骤开始时返回 0。 */
export function getLatestStartedStepIndex(stepPhases = []) {
  for (let i = stepPhases.length - 1; i >= 0; i--) {
    if (stepPhases[i] && stepPhases[i] !== 'pending') return i;
  }
  return 0;
}

/**
 * 运行详情的默认步骤：
 * - 全部步骤已结束（completed / failed）→ 第一步；
 * - 否则 → 最新开始步骤。
 */
export function getInitialStepIndex(stepPhases = []) {
  if (stepPhases.length === 0) return 0;
  const allDone = stepPhases.every((phase) => phase === 'completed' || phase === 'failed');
  return allDone ? 0 : getLatestStartedStepIndex(stepPhases);
}

/** 当前处于 running / awaiting 的最后一个步骤下标；用于跟随新开始的步骤。 */
export function getFollowingStepIndex(stepPhases = []) {
  for (let i = stepPhases.length - 1; i >= 0; i--) {
    if (stepPhases[i] === 'running' || stepPhases[i] === 'awaiting') return i;
  }
  return -1;
}

/** 分页总页数，空列表也算 1 页。 */
export function getPageCount(total = 0, pageSize = 10) {
  return Math.max(1, Math.ceil(total / pageSize));
}

/** 取分页切片。 */
export function slicePage(items = [], page = 1, pageSize = 10) {
  const start = (Math.max(1, page) - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

export const SOP_RUN_PAGE_SIZES = [10, 25, 50];

function toPositiveInt(value, fallback) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : fallback;
}

/** 从路由 query 还原运行记录的筛选、排序与分页状态。 */
export function parseRunListQuery(query = {}) {
  const raw = query || {};
  return {
    filters: {
      title: typeof raw.title === 'string' ? raw.title : '',
      status: typeof raw.status === 'string' && SOP_PHASE_LABELS[raw.status] ? raw.status : '',
      date: typeof raw.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.date) ? raw.date : '',
    },
    sort: {
      prop: raw.sort === 'phase' ? 'phase' : 'created_at',
      order: raw.order === 'ascending' ? 'ascending' : 'descending',
    },
    page: toPositiveInt(raw.page, 1),
    pageSize: SOP_RUN_PAGE_SIZES.includes(Number(raw.page_size)) ? Number(raw.page_size) : 10,
  };
}

/** 运行记录真实的 SOP ID；路由 SOP ID 与运行不匹配时返回运行所属的 SOP。 */
export function resolveRunSopId(run, routeSopId = '') {
  const actual = run?.sop_id || '';
  if (actual && routeSopId && actual !== routeSopId) return actual;
  return routeSopId || actual;
}

/** 运行记录的标题：起步输入的文本内容。 */
export function runInputText(run) {
  const inputs = run?.state?.inputs ?? [];
  return inputs
    .map((msg) => flattenTextBlocks(msg.content))
    .filter(Boolean)
    .join(' ')
    .trim();
}

/** 把时间转成本地日期键（YYYY-MM-DD），用于按日筛选。 */
export function formatDateKey(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * 前端运行记录查询：按状态（完全匹配）、日期（到日）、标题（模糊匹配）过滤。
 * 与 `useSopRunQuery` 一起模拟后端查询，UI 层只关心结果。
 */
export function filterRuns(runs = [], filters = {}) {
  const title = (filters.title || '').trim().toLowerCase();
  const status = filters.status || '';
  const date = filters.date || '';
  return runs.filter((run) => {
    const phase = run?.state?.phase || 'pending';
    if (status && phase !== status) return false;
    if (date && formatDateKey(run?.created_at) !== date) return false;
    if (title && !runInputText(run).toLowerCase().includes(title)) return false;
    return true;
  });
}

const RUN_STATUS_ORDER = {
  pending: 0,
  running: 1,
  awaiting: 2,
  completed: 3,
  failed: 4,
};

/** 前端运行记录排序：支持按创建时间与状态排序。 */
export function sortRuns(runs = [], { prop = 'created_at', order = 'descending' } = {}) {
  const direction = order === 'ascending' ? 1 : -1;
  const list = [...runs];
  list.sort((a, b) => {
    if (prop === 'phase') {
      const left = RUN_STATUS_ORDER[a?.state?.phase || 'pending'] ?? 99;
      const right = RUN_STATUS_ORDER[b?.state?.phase || 'pending'] ?? 99;
      return (left - right) * direction;
    }
    const left = new Date(a?.created_at || 0).getTime() || 0;
    const right = new Date(b?.created_at || 0).getTime() || 0;
    return (left - right) * direction;
  });
  return list;
}

/** 智能体展示名。 */
export function agentDisplayName(agents = [], agentId) {
  const agent = (agents || []).find((item) => item.id === agentId);
  return agent?.data?.name || agentId || '—';
}

/** 验证者展示文案。 */
export function verifierLabel(agents = [], definition = {}) {
  const verifier = definition?.verifier;
  if (!verifier) return '无需验收';
  if (verifier.type === 'human') return '人工验收';
  return `智能体验收 · ${agentDisplayName(agents, verifier.agent?.agent_id)}`;
}

/**
 * 收集某一步骤在会话中的锚点 ID：`state.steps[i].given` 的消息 ID 与内容块 ID。
 * 后端会把 given 消息原样写入会话（后续步骤的 handover 内容块也会复用上一步提交块的 ID），
 * 因此这些 ID 可以在会话历史中精确定位该步骤的起点。
 */
export function collectStepAnchorIds(run, stepIndex) {
  const given = run?.state?.steps?.[stepIndex]?.given ?? [];
  const ids = [];
  given.forEach((msg) => {
    if (msg?.id) ids.push(msg.id);
    (msg?.content ?? []).forEach((block) => {
      if (block?.id) ids.push(block.id);
    });
  });
  return [...new Set(ids)];
}

/**
 * 在会话消息中找到步骤起点：
 * 1. 优先按锚点 ID（消息 ID / 内容块 ID）精确匹配；
 * 2. 找不到时回退到 SOP 系统提示中的 `## <步骤标题>` 文本标记。
 * @returns {number} 消息下标，未找到返回 -1。
 */
export function findStepMessageIndex(messages = [], { ids = [], subject = '' } = {}) {
  const anchorIds = new Set((ids || []).filter(Boolean));
  if (anchorIds.size > 0) {
    const index = messages.findIndex(
      (msg) => anchorIds.has(msg?.id) || (msg?.content ?? []).some((block) => block?.id && anchorIds.has(block.id)),
    );
    if (index >= 0) return index;
  }
  if (!subject) return -1;
  const marker = `## ${subject}`;
  return messages.findIndex((msg) => flattenTextBlocks(msg?.content).includes(marker));
}

/** 拼接消息内容 / 提交物中的文本块，忽略非文本块。 */
export function flattenTextBlocks(blocks) {
  if (typeof blocks === 'string') return blocks;
  if (!Array.isArray(blocks)) return '';
  return blocks
    .filter((block) => block && typeof block.text === 'string')
    .map((block) => block.text)
    .join('\n');
}
