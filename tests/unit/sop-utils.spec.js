import {
  createEmptyForm,
  formFromData,
  validateSopForm,
  buildSopData,
  collectRunSessions,
  collectStepAnchorIds,
  findStepMessageIndex,
  getAwaitingHumanStepIndex,
  getFollowingStepIndex,
  getInitialStepIndex,
  getPageCount,
  slicePage,
  agentDisplayName,
  verifierLabel,
  flattenTextBlocks,
  formatDateKey,
  filterRuns,
  runInputText,
  sortRuns,
  parseRunListQuery,
  buildRunListQuery,
  resolveRunSopId,
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

describe('运行详情默认步骤', () => {
  it('全部步骤结束时选第一步', () => {
    expect(getInitialStepIndex(['completed', 'completed'])).toBe(0);
    expect(getInitialStepIndex(['completed', 'failed'])).toBe(0);
  });

  it('未全部结束时选最新开始步骤', () => {
    expect(getInitialStepIndex(['completed', 'running'])).toBe(1);
    expect(getInitialStepIndex(['completed', 'awaiting'])).toBe(1);
    expect(getInitialStepIndex(['completed', 'pending'])).toBe(0);
  });

  it('没有步骤开始时选第一步', () => {
    expect(getInitialStepIndex(['pending', 'pending'])).toBe(0);
    expect(getInitialStepIndex([])).toBe(0);
  });

  it('跟随 running / awaiting 的最后一步', () => {
    expect(getFollowingStepIndex(['completed', 'running'])).toBe(1);
    expect(getFollowingStepIndex(['running', 'running'])).toBe(1);
    expect(getFollowingStepIndex(['running', 'awaiting'])).toBe(1);
    expect(getFollowingStepIndex(['completed', 'pending'])).toBe(-1);
    expect(getFollowingStepIndex([])).toBe(-1);
  });
});

describe('运行记录分页', () => {
  const items = Array.from({ length: 23 }, (_, index) => index + 1);

  it('按每页十条切片', () => {
    expect(slicePage(items, 1, 10)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(slicePage(items, 3, 10)).toEqual([21, 22, 23]);
    expect(slicePage(items, 4, 10)).toEqual([]);
  });

  it('页码小于 1 时按第一页处理', () => {
    expect(slicePage(items, 0, 10)[0]).toBe(1);
    expect(slicePage(items, -2, 10)[0]).toBe(1);
  });

  it('总页数至少为 1', () => {
    expect(getPageCount(0, 10)).toBe(1);
    expect(getPageCount(10, 10)).toBe(1);
    expect(getPageCount(23, 10)).toBe(3);
  });
});

describe('展示辅助', () => {
  const agents = [{ id: 'a1', data: { name: '写手' } }];

  it('优先展示智能体名称', () => {
    expect(agentDisplayName(agents, 'a1')).toBe('写手');
    expect(agentDisplayName(agents, 'a2')).toBe('a2');
    expect(agentDisplayName([], '')).toBe('—');
  });

  it('验证者文案', () => {
    expect(verifierLabel(agents, { verifier: null })).toBe('无需验收');
    expect(verifierLabel(agents, { verifier: { type: 'human' } })).toBe('人工验收');
    expect(verifierLabel(agents, { verifier: { type: 'agent', agent: { agent_id: 'a1' } } })).toBe('智能体验收 · 写手');
  });
});

describe('运行记录查询', () => {
  const runs = [
    {
      id: 'a',
      created_at: '2026-10-20T10:00:00',
      state: { phase: 'completed', inputs: [{ content: [{ type: 'text', text: '介绍太保' }] }] },
    },
    { id: 'b', created_at: '2026-10-21T09:00:00', state: { phase: 'running', inputs: [] } },
    {
      id: 'c',
      created_at: '2026-10-21T11:00:00',
      state: { phase: 'failed', inputs: [{ content: [{ type: 'text', text: '撰写周报' }] }] },
    },
  ];

  it('runInputText 拼接起步输入', () => {
    expect(runInputText(runs[0])).toBe('介绍太保');
    expect(runInputText(runs[1])).toBe('');
  });

  it('formatDateKey 转成本地日期键', () => {
    expect(formatDateKey('2026-10-20T10:00:00')).toBe('2026-10-20');
    expect(formatDateKey('')).toBe('');
    expect(formatDateKey('not-a-date')).toBe('');
  });

  it('按标题模糊匹配', () => {
    expect(filterRuns(runs, { title: '周报' }).map((run) => run.id)).toEqual(['c']);
    expect(filterRuns(runs, { title: '  太保 ' }).map((run) => run.id)).toEqual(['a']);
    expect(filterRuns(runs, { title: '不存在' })).toEqual([]);
  });

  it('按状态完全匹配', () => {
    expect(filterRuns(runs, { status: 'running' }).map((run) => run.id)).toEqual(['b']);
    expect(filterRuns(runs, { status: 'completed' }).map((run) => run.id)).toEqual(['a']);
    expect(filterRuns(runs, { status: 'run' })).toEqual([]);
  });

  it('按日期（到日）匹配', () => {
    expect(filterRuns(runs, { date: '2026-10-21' }).map((run) => run.id)).toEqual(['b', 'c']);
  });

  it('组合条件同时生效', () => {
    expect(filterRuns(runs, { date: '2026-10-21', status: 'failed' }).map((run) => run.id)).toEqual(['c']);
  });

  it('按创建时间排序', () => {
    expect(sortRuns(runs, { prop: 'created_at', order: 'ascending' }).map((run) => run.id)).toEqual(['a', 'b', 'c']);
    expect(sortRuns(runs, { prop: 'created_at', order: 'descending' }).map((run) => run.id)).toEqual(['c', 'b', 'a']);
  });

  it('按状态排序（pending → running → awaiting → completed → failed）', () => {
    const mixed = [
      { id: 'done', created_at: '2026-10-20T10:00:00', state: { phase: 'completed' } },
      { id: 'wait', created_at: '2026-10-20T10:00:00', state: { phase: 'pending' } },
      { id: 'run', created_at: '2026-10-20T10:00:00', state: { phase: 'running' } },
      { id: 'fail', created_at: '2026-10-20T10:00:00', state: { phase: 'failed' } },
    ];
    expect(sortRuns(mixed, { prop: 'phase', order: 'ascending' }).map((run) => run.id)).toEqual([
      'wait',
      'run',
      'done',
      'fail',
    ]);
  });
});

describe('运行记录查询参数', () => {
  it('解析合法的筛选、排序与分页', () => {
    expect(
      parseRunListQuery({
        title: '周报',
        status: 'running',
        date: '2026-10-21',
        sort: 'phase',
        order: 'ascending',
        page: '3',
        page_size: '25',
      }),
    ).toEqual({
      filters: { title: '周报', status: 'running', date: '2026-10-21' },
      sort: { prop: 'phase', order: 'ascending' },
      page: 3,
      pageSize: 25,
    });
  });

  it('非法参数回退默认值', () => {
    expect(
      parseRunListQuery({
        status: 'unknown',
        date: '10-21',
        sort: 'unknown',
        order: 'unknown',
        page: '0',
        page_size: '20',
      }),
    ).toEqual({
      filters: { title: '', status: '', date: '' },
      sort: { prop: 'created_at', order: 'descending' },
      page: 1,
      pageSize: 10,
    });
  });

  it('序列化时省略默认值', () => {
    expect(
      buildRunListQuery({
        filters: { title: '', status: '', date: '' },
        sort: { prop: 'created_at', order: 'descending' },
        page: 1,
        pageSize: 10,
      }),
    ).toEqual({});

    expect(
      buildRunListQuery({
        filters: { title: ' 周报 ', status: 'completed', date: '2026-10-20' },
        sort: { prop: 'phase', order: 'ascending' },
        page: 2,
        pageSize: 50,
      }),
    ).toEqual({
      title: '周报',
      status: 'completed',
      date: '2026-10-20',
      sort: 'phase',
      order: 'ascending',
      page: '2',
      page_size: '50',
    });
  });

  it('解析后可以原样序列化', () => {
    const query = {
      title: '周报',
      status: 'failed',
      date: '2026-10-21',
      sort: 'phase',
      order: 'ascending',
      page: '2',
      page_size: '25',
    };
    expect(buildRunListQuery(parseRunListQuery(query))).toEqual(query);
  });
});

describe('运行归属校验', () => {
  it('一致或缺少信息时保留路由 sopId', () => {
    expect(resolveRunSopId({ sop_id: 'sop-a' }, 'sop-a')).toBe('sop-a');
    expect(resolveRunSopId({}, 'sop-a')).toBe('sop-a');
    expect(resolveRunSopId({ sop_id: 'sop-a' }, '')).toBe('sop-a');
  });

  it('不一致时返回运行的实际归属', () => {
    expect(resolveRunSopId({ sop_id: 'sop-b' }, 'sop-a')).toBe('sop-b');
  });
});

describe('步骤消息定位', () => {
  const messages = [
    { id: 'msg-0', content: [{ type: 'text', id: 'blk-0', text: '<system-reminder>## 第一步</system-reminder>' }] },
    { id: 'msg-1', content: [{ type: 'text', id: 'blk-1', text: '介绍太保' }] },
    {
      id: 'msg-2',
      content: [
        { type: 'text', id: 'blk-2', text: '<handover from="第一步">' },
        { type: 'text', id: 'blk-3', text: '上一步的交付内容' },
        { type: 'text', id: 'blk-4', text: '</handover>' },
      ],
    },
  ];

  it('collectStepAnchorIds 收集 given 的消息 ID 与内容块 ID 并去重', () => {
    const run = {
      state: {
        steps: [
          {
            given: [{ id: 'msg-1', content: [{ id: 'blk-1' }, { id: 'msg-1' }] }],
          },
        ],
      },
    };
    expect(collectStepAnchorIds(run, 0)).toEqual(['msg-1', 'blk-1']);
  });

  it('优先按消息 ID 命中', () => {
    expect(findStepMessageIndex(messages, { ids: ['msg-1'], subject: '第二步' })).toBe(1);
  });

  it('按内容块 ID 命中（handover 复用上一步提交块）', () => {
    expect(findStepMessageIndex(messages, { ids: ['blk-3'] })).toBe(2);
  });

  it('无 ID 命中时回退到步骤标题标记', () => {
    expect(findStepMessageIndex(messages, { ids: ['missing'], subject: '第一步' })).toBe(0);
  });

  it('都没有命中时返回 -1', () => {
    expect(findStepMessageIndex(messages, { ids: ['missing'], subject: '不存在' })).toBe(-1);
    expect(findStepMessageIndex([], {})).toBe(-1);
  });
});
