import Vue from 'vue';
import CompositionApi from '@vue/composition-api';
import { shallowMount } from '@vue/test-utils';
import SopRunView from '@/views/sop/SopRunView.vue';
import { sopApi } from '@/api';

Vue.use(CompositionApi);

async function flushPromises() {
  for (let i = 0; i < 10; i++) await Promise.resolve();
  await Vue.nextTick();
}

const mockRoute = { params: { sopId: 'sop-a', runId: 'run-1' }, query: {} };
const mockRouter = { push: jest.fn(), replace: jest.fn() };

jest.mock('@/composables/vue-router', () => ({
  useRoute: () => mockRoute,
  useRouter: () => mockRouter,
}));

jest.mock('@/api', () => ({
  sopApi: {
    getRun: jest.fn(),
    removeRun: jest.fn(),
    submitVerdict: jest.fn(),
  },
}));

jest.mock('@/composables/useAgents', () => ({
  useAgents: () => ({ agents: [] }),
}));

jest.mock('@/utils/common', () => ({
  confirmDialog: jest.fn(),
}));

// 避免加载聊天内核（其中 element-ui 的 ESM 工具文件无法被 Jest 直接解析）
jest.mock('@/components/sop/SopSessionViewer.vue', () => ({
  name: 'SopSessionViewer',
  props: ['entries', 'agents', 'runId', 'sessionKey', 'focusRequest'],
  render(h) {
    return h('div');
  },
}));

const StepStripStub = {
  name: 'SopStepStrip',
  props: ['steps', 'activeIndex'],
  render(h) {
    return h('div');
  },
};

const StepDeliveryStub = {
  name: 'SopStepDelivery',
  props: ['step', 'agents', 'awaitingHuman'],
  render(h) {
    return h('div');
  },
};

const SessionViewerStub = {
  name: 'SopSessionViewer',
  props: ['entries', 'agents', 'runId', 'sessionKey', 'focusRequest'],
  render(h) {
    return h('div');
  },
};

function makeRun({ phase = 'completed', stepPhases = ['completed', 'completed'], sopId = 'sop-a' } = {}) {
  return {
    id: 'run-1',
    sop_id: sopId,
    created_at: '2026-10-21T10:00:00',
    updated_at: '2026-10-21T10:05:00',
    definition: {
      name: '写作流程',
      steps: [
        {
          subject: '撰写初稿',
          description: '写初稿',
          executor: { agent_id: 'agent-1', session_key: 'writer' },
          verifier: { type: 'human', question: '可以发布吗？' },
          max_attempts: 3,
        },
        {
          subject: '增加作者',
          description: '追加署名',
          executor: { agent_id: 'agent-1', session_key: 'writer' },
          verifier: null,
          max_attempts: 3,
        },
      ],
    },
    state: {
      phase,
      inputs: [],
      steps: stepPhases.map((stepPhase) => ({ phase: stepPhase })),
    },
    sessions: { writer: 'session-1' },
  };
}

function mountView() {
  return shallowMount(SopRunView, {
    stubs: {
      SopStepStrip: StepStripStub,
      SopStepDelivery: StepDeliveryStub,
      SopSessionViewer: SessionViewerStub,
      StatusBadge: true,
      Spinner: true,
      Icon: true,
      'el-button': true,
      'el-input': true,
    },
  });
}

describe('SopRunView', () => {
  beforeEach(() => {
    jest.useRealTimers();
    mockRouter.push.mockClear();
    mockRouter.replace.mockClear();
    sopApi.getRun.mockReset();
    mockRoute.params = { sopId: 'sop-a', runId: 'run-1' };
    mockRoute.query = {};
  });

  it('深链中的 SOP 与运行不匹配时纠正路由', async () => {
    mockRoute.params = { sopId: 'wrong-sop', runId: 'run-1' };
    sopApi.getRun.mockResolvedValue(makeRun({ sopId: 'actual-sop' }));

    const wrapper = mountView();
    await flushPromises();

    expect(mockRouter.replace).toHaveBeenCalledWith({
      name: 'sop-run',
      params: { sopId: 'actual-sop', runId: 'run-1' },
      query: {},
    });
    wrapper.destroy();
  });

  it('归属一致时不修改路由', async () => {
    sopApi.getRun.mockResolvedValue(makeRun({ sopId: 'sop-a' }));

    const wrapper = mountView();
    await flushPromises();

    expect(mockRouter.replace).not.toHaveBeenCalled();
    wrapper.destroy();
  });

  it('新步骤开始后自动切换到该步骤', async () => {
    jest.useFakeTimers();
    sopApi.getRun
      .mockResolvedValueOnce(makeRun({ phase: 'running', stepPhases: ['running', 'pending'] }))
      .mockResolvedValueOnce(makeRun({ phase: 'running', stepPhases: ['completed', 'running'] }));

    const wrapper = mountView();
    await flushPromises();
    await Vue.nextTick();
    expect(wrapper.findComponent(StepDeliveryStub).props('step').index).toBe(0);

    jest.advanceTimersByTime(2500);
    await flushPromises();
    await Vue.nextTick();

    expect(wrapper.findComponent(StepDeliveryStub).props('step').index).toBe(1);
    wrapper.destroy();
    jest.useRealTimers();
  });

  it('交付 / 会话 Tab 按步骤独立记忆', async () => {
    sopApi.getRun.mockResolvedValue(makeRun());

    const wrapper = mountView();
    await flushPromises();
    await Vue.nextTick();

    expect(wrapper.vm.activeTab).toBe('delivery');

    wrapper.vm.setTab('session');
    await Vue.nextTick();
    expect(wrapper.vm.activeTab).toBe('session');

    const strip = wrapper.findComponent(StepStripStub);
    strip.vm.$emit('select', 1);
    await Vue.nextTick();
    expect(wrapper.vm.activeTab).toBe('delivery');

    wrapper.vm.setTab('session');
    await Vue.nextTick();
    strip.vm.$emit('select', 0);
    await Vue.nextTick();
    expect(wrapper.vm.activeTab).toBe('session');

    wrapper.destroy();
  });

  it('只在切入会话 Tab 时定位消息起点，会话内切换步骤不重复定位', async () => {
    sopApi.getRun.mockResolvedValue(makeRun());

    const wrapper = mountView();
    await flushPromises();
    await Vue.nextTick();

    wrapper.vm.setTab('session');
    await Vue.nextTick();
    const focus = wrapper.vm.focusRequest;
    expect(focus).not.toBeNull();

    // 会话 Tab 下再次选择当前步骤（轮询抖动也会走到这里）：不应重新发起定位
    const strip = wrapper.findComponent(StepStripStub);
    strip.vm.$emit('select', 0);
    await Vue.nextTick();
    expect(wrapper.vm.focusRequest).toBe(focus);

    wrapper.destroy();
  });
});
