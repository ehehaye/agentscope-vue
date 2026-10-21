import Vue from 'vue';
import CompositionApi from '@vue/composition-api';
import { mount } from '@vue/test-utils';
import SopStepStrip from '@/views/sop/SopStepStrip.vue';

Vue.use(CompositionApi);

function makeSteps() {
  return [
    { index: 0, definition: { subject: '撰写初稿', description: '第一步' }, state: { phase: 'completed' } },
    { index: 1, definition: { subject: '增加作者', description: '第二步' }, state: { phase: 'pending' } },
    { index: 2, definition: { subject: '发布', description: '第三步' }, state: { phase: 'running' } },
  ];
}

function mountStrip(propsData = {}) {
  return mount(SopStepStrip, {
    propsData: { steps: makeSteps(), activeIndex: 0, ...propsData },
    stubs: { StatusBadge: true },
  });
}

describe('SopStepStrip', () => {
  beforeAll(() => {
    Element.prototype.scrollIntoView = jest.fn();
  });

  it('未开始的步骤禁用点击并显示禁止光标', async () => {
    const wrapper = mountStrip();
    const pending = wrapper.findAll('button').at(1);

    expect(pending.attributes('disabled')).toBe('disabled');
    expect(pending.classes()).toContain('tw-cursor-not-allowed');

    await pending.trigger('click');
    expect(wrapper.emitted('select')).toBeFalsy();
    wrapper.destroy();
  });

  it('点击已开始的步骤时抛出下标', async () => {
    const wrapper = mountStrip();
    const buttons = wrapper.findAll('button');

    await buttons.at(2).trigger('click');
    expect(wrapper.emitted('select')[0]).toEqual([2]);

    await buttons.at(0).trigger('click');
    expect(wrapper.emitted('select')[1]).toEqual([0]);
    wrapper.destroy();
  });

  it('激活项使用主色边框', () => {
    const wrapper = mountStrip({ activeIndex: 2 });
    const buttons = wrapper.findAll('button');

    expect(buttons.at(2).classes()).toContain('tw-border-primary');
    expect(buttons.at(0).classes()).not.toContain('tw-border-primary');
    wrapper.destroy();
  });
});
