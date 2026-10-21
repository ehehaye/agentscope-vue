import Vue from 'vue';
import CompositionApi, { ref } from '@vue/composition-api';
import { mount } from '@vue/test-utils';
import { useSopRunQuery } from '@/composables/useSopRunQuery';

Vue.use(CompositionApi);

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

function mountQuery(runs, options = {}) {
  const Host = {
    setup() {
      return useSopRunQuery(runs, options);
    },
    render(h) {
      return h('div');
    },
  };
  return mount(Host);
}

describe('useSopRunQuery', () => {
  it('默认按创建时间倒序并分页', () => {
    const wrapper = mountQuery(ref(makeRuns(12)));
    expect(wrapper.vm.total).toBe(12);
    expect(wrapper.vm.page).toBe(1);
    expect(wrapper.vm.pageSize).toBe(10);
    expect(wrapper.vm.rows).toHaveLength(10);
    expect(wrapper.vm.rows[0].id).toBe('run-12');
    wrapper.destroy();
  });

  it('筛选条件为草稿，调用 query 后才生效', async () => {
    const wrapper = mountQuery(ref(makeRuns(12)));

    wrapper.vm.filters.title = '标题 1';
    await Vue.nextTick();
    expect(wrapper.vm.total).toBe(12);

    wrapper.vm.query();
    await Vue.nextTick();
    expect(wrapper.vm.total).toBe(4);
    expect(wrapper.vm.rows.map((run) => run.id).sort()).toEqual(['run-1', 'run-10', 'run-11', 'run-12']);
    wrapper.destroy();
  });

  it('resetFilters 清空条件并重新查询', async () => {
    const wrapper = mountQuery(ref(makeRuns(12)));

    wrapper.vm.filters.status = 'failed';
    wrapper.vm.query();
    await Vue.nextTick();
    expect(wrapper.vm.total).toBe(2);

    wrapper.vm.resetFilters();
    await Vue.nextTick();
    expect(wrapper.vm.filters.status).toBe('');
    expect(wrapper.vm.total).toBe(12);
    wrapper.destroy();
  });

  it('切换每页条数后回到第一页', async () => {
    const wrapper = mountQuery(ref(makeRuns(12)));

    wrapper.vm.setPage(2);
    await Vue.nextTick();
    expect(wrapper.vm.rows).toHaveLength(2);

    wrapper.vm.setPageSize(25);
    await Vue.nextTick();
    expect(wrapper.vm.page).toBe(1);
    expect(wrapper.vm.pageSize).toBe(25);
    expect(wrapper.vm.rows).toHaveLength(12);
    wrapper.destroy();
  });

  it('按状态排序', async () => {
    const wrapper = mountQuery(ref(makeRuns(12)), { pageSize: 25 });

    wrapper.vm.setSort({ prop: 'phase', order: 'ascending' });
    await Vue.nextTick();
    expect(wrapper.vm.rows.map((run) => run.state.phase).slice(0, 5)).toEqual([
      'pending',
      'pending',
      'pending',
      'running',
      'running',
    ]);
    wrapper.destroy();
  });

  it('外部还原 queryState 后重新筛选并同步草稿条件', async () => {
    const wrapper = mountQuery(ref(makeRuns(12)));

    wrapper.vm.queryState.status = 'completed';
    wrapper.vm.queryState.page_size = 25;
    await Vue.nextTick();

    expect(wrapper.vm.filters.status).toBe('completed');
    expect(wrapper.vm.pageSize).toBe(25);
    expect(wrapper.vm.total).toBe(2);
    expect(wrapper.vm.rows.every((run) => run.state.phase === 'completed')).toBe(true);
    wrapper.destroy();
  });
});
