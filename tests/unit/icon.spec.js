import { mount } from '@vue/test-utils';
import Icon from '@/components/ui/Icon.vue';

describe('Icon', () => {
  it('merges the default cursor class with caller classes', () => {
    const wrapper = mount({
      render(h) {
        return h(Icon, { staticClass: 'tw-h-4', attrs: { icon: 'lucide:x' } });
      },
    });
    const svg = wrapper.find('svg');
    expect(svg.exists()).toBe(true);
    expect(svg.classes()).toEqual(expect.arrayContaining(['tw-cursor-pointer', 'tw-h-4']));
  });

  it('renders its own disabled state without a button wrapper', () => {
    const wrapper = mount({
      render(h) {
        return h(Icon, {
          staticClass: 'tw-h-4',
          props: { icon: 'lucide:x', disabled: true },
        });
      },
    });
    const svg = wrapper.find('svg');
    expect(svg.classes()).toEqual(expect.arrayContaining(['tw-cursor-not-allowed', 'tw-opacity-50', 'tw-h-4']));
    expect(svg.classes()).not.toContain('tw-cursor-pointer');
    expect(svg.attributes('disabled')).toBeUndefined();
  });
});
