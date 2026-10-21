import Vue from 'vue';
import CompositionApi from '@vue/composition-api';
import { mount } from '@vue/test-utils';
import ElTabs from 'element-ui/lib/tabs';
import ElTabPane from 'element-ui/lib/tab-pane';
import SopStepStrip from '@/views/sop/SopStepStrip.vue';

Vue.use(CompositionApi);
Vue.component(ElTabs.name, ElTabs);
Vue.component(ElTabPane.name, ElTabPane);

function makeSteps() {
  return [
    { index: 0, definition: { subject: '撰写初稿', description: '第一步' }, state: { phase: 'completed' } },
    { index: 1, definition: { subject: '增加作者', description: '第二步' }, state: { phase: 'pending' } },
    { index: 2, definition: { subject: '发布', description: '第三步' }, state: { phase: 'running' } },
  ];
}

async function mountStrip(propsData = {}) {
  const wrapper = mount(SopStepStrip, {
    propsData: { steps: makeSteps(), activeIndex: 0, ...propsData },
    stubs: { StatusBadge: true },
  });
  // el-tabs 在 mounted 后才收集 pane，等一次渲染再断言。
  await Vue.nextTick();
  return wrapper;
}

// el-tabs 在 currentName 变化后会排两次 nextTick 滚动到激活项，
// 等它们执行完再销毁，避免 $refs 已清空时回调报错。
async function destroyStrip(wrapper) {
  await Vue.nextTick();
  await Vue.nextTick();
  wrapper.destroy();
}

describe('SopStepStrip', () => {
  it('未开始的步骤禁用点击并显示禁止光标', async () => {
    const wrapper = await mountStrip();
    const pending = wrapper.findAll('.el-tabs__item').at(1);

    expect(pending.classes()).toContain('is-disabled');
    expect(pending.find('[data-step-index]').classes()).toContain('tw-cursor-not-allowed');

    await pending.trigger('click');
    expect(wrapper.emitted('select')).toBeFalsy();
    await destroyStrip(wrapper);
  });

  it('点击已开始的步骤时抛出下标', async () => {
    const wrapper = await mountStrip({ activeIndex: 2 });
    const items = wrapper.findAll('.el-tabs__item');

    await items.at(0).trigger('click');
    expect(wrapper.emitted('select')[0]).toEqual([0]);

    await items.at(2).trigger('click');
    expect(wrapper.emitted('select')).toHaveLength(1);
    await destroyStrip(wrapper);
  });

  it('激活项使用主色边框', async () => {
    const wrapper = await mountStrip({ activeIndex: 2 });
    const cards = wrapper.findAll('[data-step-index]');

    expect(cards.at(2).classes()).toContain('tw-border-primary');
    expect(cards.at(0).classes()).not.toContain('tw-border-primary');
    await destroyStrip(wrapper);
  });
});
