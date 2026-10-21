import Vue from 'vue';
import CompositionApi from '@vue/composition-api';
import { mount } from '@vue/test-utils';
import { useSopRuns } from '@/composables/useSopRuns';
import { sopApi } from '@/api';

Vue.use(CompositionApi);

jest.mock('@/api', () => ({
  sopApi: {
    listRuns: jest.fn(),
    startRun: jest.fn(),
    removeRun: jest.fn(),
  },
}));

const PHASES = ['pending', 'running', 'awaiting', 'completed', 'failed'];

function makeRuns(count = 12) {
  return Array.from({ length: count }, (_, index) => ({
    id: `run-${index + 1}`,
    created_at: new Date(Date.UTC(2026, 9, index + 1, index)).toISOString(),
    state: {
      phase: PHASES[index % PHASES.length],
      inputs: [{ content: [{ type: 'text', text: `标题 ${index + 1}` }] }],
    },
  }));
}

async function flushPromises() {
  for (let i = 0; i < 10; i++) await Promise.resolve();
  await Vue.nextTick();
}

function mountRuns(initialQuery) {
  const Host = {
    setup() {
      return useSopRuns('sop-a', initialQuery);
    },
    render(h) {
      return h('div');
    },
  };
  return mount(Host);
}

describe('useSopRuns', () => {
  beforeEach(() => {
    sopApi.listRuns.mockReset();
    sopApi.listRuns.mockResolvedValue({ runs: makeRuns(12) });
  });

  it('拉取运行记录后按默认条件返回第一页', async () => {
    const wrapper = mountRuns();
    await flushPromises();

    expect(sopApi.listRuns).toHaveBeenCalledWith({ sop_id: 'sop-a' });
    expect(wrapper.vm.total).toBe(12);
    expect(wrapper.vm.rows).toHaveLength(10);
    expect(wrapper.vm.page).toBe(1);
    wrapper.destroy();
  });

  it('分页、筛选与排序按查询接口的方式生效', async () => {
    const wrapper = mountRuns();
    await flushPromises();

    wrapper.vm.setPage(2);
    await Vue.nextTick();
    expect(wrapper.vm.rows).toHaveLength(2);

    wrapper.vm.filters.status = 'failed';
    wrapper.vm.query();
    await Vue.nextTick();
    expect(wrapper.vm.page).toBe(1);
    expect(wrapper.vm.total).toBe(2);
    expect(wrapper.vm.rows.every((run) => run.state.phase === 'failed')).toBe(true);
    wrapper.destroy();
  });

  it('从 URL 还原的初始条件生效', async () => {
    const wrapper = mountRuns({
      filters: { title: '', status: 'completed', date: '' },
      sort: { prop: 'created_at', order: 'descending' },
      page: 1,
      pageSize: 25,
    });
    await flushPromises();

    expect(wrapper.vm.filters.status).toBe('completed');
    expect(wrapper.vm.pageSize).toBe(25);
    expect(wrapper.vm.total).toBe(2);
    wrapper.destroy();
  });
});
