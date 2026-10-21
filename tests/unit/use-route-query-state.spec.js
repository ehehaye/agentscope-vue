import Vue from 'vue';
import CompositionApi, { reactive } from '@vue/composition-api';
import { mount } from '@vue/test-utils';
import { useRouteQueryState } from '@/composables/useRouteQueryState';

Vue.use(CompositionApi);

const mockRouter = { push: jest.fn(), replace: jest.fn() };
let mockRoute;

jest.mock('@/composables/vue-router', () => ({
  useRoute: () => mockRoute,
  useRouter: () => mockRouter,
}));

const DEFAULTS = { title: '', page: 1, sort: 'created_at' };

function mountState() {
  const Host = {
    setup() {
      const state = reactive({ title: '', page: 1, sort: 'created_at' });
      useRouteQueryState(state, { defaults: DEFAULTS });
      return { state };
    },
    render(h) {
      return h('div');
    },
  };
  return mount(Host);
}

describe('useRouteQueryState', () => {
  beforeEach(() => {
    mockRoute = reactive({ query: {} });
    mockRouter.replace.mockClear();
  });

  it('条件变化后写入 URL，默认值与空值省略', async () => {
    const wrapper = mountState();

    wrapper.vm.state.title = '周报';
    wrapper.vm.state.page = 2;
    await Vue.nextTick();

    expect(mockRouter.replace).toHaveBeenCalledWith({ query: { title: '周报', page: '2' } });
    wrapper.destroy();
  });

  it('自己写入的 query 不会反向覆盖条件', async () => {
    const wrapper = mountState();

    wrapper.vm.state.page = 2;
    await Vue.nextTick();
    expect(mockRouter.replace).toHaveBeenCalledTimes(1);

    mockRoute.query = { page: '2' };
    await Vue.nextTick();

    expect(wrapper.vm.state.page).toBe(2);
    wrapper.destroy();
  });

  it('外部修改 query 时反向覆盖条件，并按默认值类型转换', async () => {
    const wrapper = mountState();

    mockRoute.query = { title: '标题', page: '3' };
    await Vue.nextTick();

    expect(wrapper.vm.state.title).toBe('标题');
    expect(wrapper.vm.state.page).toBe(3);
    expect(wrapper.vm.state.sort).toBe('created_at');
    wrapper.destroy();
  });

  it('query 缺少的参数回退默认值', async () => {
    const wrapper = mountState();

    wrapper.vm.state.title = '标题';
    await Vue.nextTick();

    mockRoute.query = {};
    await Vue.nextTick();

    expect(wrapper.vm.state.title).toBe('');
    wrapper.destroy();
  });
});
