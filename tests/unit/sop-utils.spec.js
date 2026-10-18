import {
  createEmptyForm,
  formFromData,
  validateSopForm,
  buildSopData,
  collectRunSessions,
  getAwaitingHumanStepIndex,
  flattenTextBlocks,
} from '@/views/sop/sop-utils';

function validForm() {
  return {
    name: 'write-article',
    description: '写作流程',
    workspace_grain: 'run',
    steps: [
      {
        subject: '撰写初稿',
        description: '写出一篇初稿',
        executor: { agent_id: 'agent-writer', session_key: 'writer' },
        verifier: {
          type: 'agent',
          agent: { agent_id: 'agent-reviewer', session_key: 'reviewer' },
          criteria: '覆盖核心要点',
          question: '',
        },
        max_attempts: 3,
      },
    ],
    session_settings: {
      writer: {
        chat_model_config: { type: 'dashscope', credential_id: 'cred-1', model: 'qwen-max', parameters: {} },
        fallback_chat_model_config: null,
        permission_mode: 'default',
      },
      reviewer: {
        chat_model_config: { type: 'dashscope', credential_id: 'cred-1', model: 'qwen-max', parameters: {} },
        fallback_chat_model_config: null,
        permission_mode: 'default',
      },
    },
  };
}

describe('createEmptyForm', () => {
  it('生成一个默认步骤与空的会话设置', () => {
    const form = createEmptyForm('agent-1');
    expect(form.workspace_grain).toBe('run');
    expect(form.steps).toHaveLength(1);
    expect(form.steps[0].executor.agent_id).toBe('agent-1');
    expect(form.steps[0].verifier.type).toBe('none');
    expect(form.session_settings).toEqual({});
  });
});

describe('formFromData', () => {
  it('把 null verifier 归一化为 none，并保留会话设置', () => {
    const form = formFromData({
      name: 'demo',
      description: '',
      workspace_grain: 'per_session_key',
      steps: [
        {
          subject: 's1',
          description: 'd1',
          executor: { agent_id: 'a1', session_key: 'k1' },
          verifier: null,
          max_attempts: 2,
        },
      ],
      session_settings: {
        k1: {
          chat_model_config: { type: 'openai', credential_id: 'c1', model: 'm1', parameters: {} },
          permission_mode: 'bypass',
        },
      },
    });

    expect(form.steps[0].verifier.type).toBe('none');
    expect(form.steps[0].max_attempts).toBe(2);
    expect(form.session_settings.k1.permission_mode).toBe('bypass');
    expect(form.workspace_grain).toBe('per_session_key');
  });

  it('步骤为空时补一个空步骤', () => {
    const form = formFromData({ name: 'x', steps: [] });
    expect(form.steps).toHaveLength(1);
  });
});

describe('validateSopForm', () => {
  it('合法表单通过', () => {
    expect(validateSopForm(validForm())).toBeNull();
  });

  it('缺少步骤时报错', () => {
    const form = validForm();
    form.steps = [];
    expect(validateSopForm(form)).toContain('至少需要一个步骤');
  });

  it('缺少会话模型配置时报错', () => {
    const form = validForm();
    form.session_settings.reviewer.chat_model_config = null;
    expect(validateSopForm(form)).toContain('会话键「reviewer」未配置主模型');
  });

  it('同一会话键指向不同智能体时报错', () => {
    const form = validForm();
    form.steps[0].verifier.agent.session_key = 'writer';
    expect(validateSopForm(form)).toContain('会话键「writer」同时被多个智能体使用');
  });

  it('人工验证者缺少问题时报告', () => {
    const form = validForm();
    form.steps[0].verifier = {
      type: 'human',
      agent: { agent_id: '', session_key: '' },
      criteria: '',
      question: '',
    };
    expect(validateSopForm(form)).toContain('请填写人工验收问题');
  });
});

describe('buildSopData', () => {
  it('verifier none 输出 null，并裁剪未使用的会话设置', () => {
    const form = validForm();
    form.steps[0].verifier = {
      type: 'none',
      agent: { agent_id: '', session_key: '' },
      criteria: '',
      question: '',
    };
    form.session_settings.unused = {
      chat_model_config: { type: 'x', credential_id: 'c', model: 'm' },
      permission_mode: 'default',
    };

    const data = buildSopData(form);
    expect(data.steps[0].verifier).toBeNull();
    expect(data.steps[0].version).toBe('v1');
    expect(Object.keys(data.session_settings)).toEqual(['writer']);
    expect(data.session_settings.writer).not.toHaveProperty('fallback_chat_model_config');
  });
});

describe('collectRunSessions', () => {
  it('合并执行者与智能体验证者，并关联 session_id', () => {
    const run = {
      definition: {
        steps: [
          {
            executor: { agent_id: 'a1', session_key: 'writer' },
            verifier: { type: 'agent', agent: { agent_id: 'a2', session_key: 'reviewer' } },
          },
          {
            executor: { agent_id: 'a1', session_key: 'writer' },
            verifier: { type: 'human', question: 'ok?' },
          },
        ],
      },
      sessions: { writer: 'session-1', reviewer: { session_id: 'session-2' } },
    };

    const sessions = collectRunSessions(run);
    expect(sessions).toEqual([
      { session_key: 'writer', agent_id: 'a1', session_id: 'session-1', roles: ['执行者'] },
      { session_key: 'reviewer', agent_id: 'a2', session_id: 'session-2', roles: ['验证者'] },
    ]);
  });
});

describe('getAwaitingHumanStepIndex', () => {
  it('仅人工验证者且步骤 awaiting 时返回下标', () => {
    const run = {
      state: {
        phase: 'awaiting',
        steps: [{ phase: 'completed' }, { phase: 'awaiting', submission: [{ type: 'text', text: '终稿' }] }],
      },
      definition: {
        steps: [{ verifier: { type: 'agent' } }, { verifier: { type: 'human', question: '可以发布吗？' } }],
      },
    };
    expect(getAwaitingHumanStepIndex(run)).toBe(1);
  });

  it('执行者尚未交付时不算人工验收', () => {
    const run = {
      state: {
        phase: 'awaiting',
        steps: [{ phase: 'awaiting', submission: [] }],
      },
      definition: { steps: [{ verifier: { type: 'human', question: '?' } }] },
    };
    expect(getAwaitingHumanStepIndex(run)).toBe(-1);
  });

  it('运行不是 awaiting 时返回 -1', () => {
    const run = {
      state: { phase: 'running', steps: [{ phase: 'awaiting' }] },
      definition: { steps: [{ verifier: { type: 'human', question: '?' } }] },
    };
    expect(getAwaitingHumanStepIndex(run)).toBe(-1);
  });
});

describe('flattenTextBlocks', () => {
  it('拼接文本块并忽略非文本块', () => {
    expect(
      flattenTextBlocks([
        { type: 'text', text: '第一段' },
        { type: 'tool_call', id: 'x' },
        { type: 'text', text: '第二段' },
      ]),
    ).toBe('第一段\n第二段');
  });

  it('非数组输入返回空串', () => {
    expect(flattenTextBlocks(null)).toBe('');
  });
});
