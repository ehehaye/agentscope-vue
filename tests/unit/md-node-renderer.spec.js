import { mount } from '@vue/test-utils';
import NodeRenderer from '@/components/md/NodeRenderer.vue';
import { registerTagComp } from '@/components/md/registry';

describe('NodeRenderer', () => {
  it('未注册节点回退为原生标签，并透传属性与文本子节点', () => {
    const node = {
      type: 'tag',
      tagName: 'div',
      attribs: { class: 'wrap', 'data-x': '1' },
      children: [{ type: 'text', data: 'hello' }],
    };

    const wrapper = mount(NodeRenderer, { propsData: { node } });
    const html = wrapper.html();
    expect(html).toContain('<div');
    expect(html).toContain('class="wrap"');
    expect(html).toContain('data-x="1"');
    expect(html).toContain('hello');
  });

  it('递归渲染嵌套子节点', () => {
    const node = {
      type: 'tag',
      tagName: 'div',
      attribs: {},
      children: [
        { type: 'text', data: 'outer' },
        {
          type: 'tag',
          tagName: 'span',
          attribs: { class: 'inner' },
          children: [{ type: 'text', data: 'nested' }],
        },
      ],
    };

    const wrapper = mount(NodeRenderer, { propsData: { node } });
    expect(wrapper.find('span.inner').exists()).toBe(true);
    expect(wrapper.find('span.inner').text()).toBe('nested');
    expect(wrapper.text()).toContain('outer');
  });

  it('已注册标签渲染为自定义组件并使用 resolve 的 props', () => {
    const NrWidget = {
      name: 'NrWidget',
      props: ['label'],
      render(h) {
        return h('em', { class: 'nr' }, this.label);
      },
    };
    registerTagComp('nr-widget', {
      component: NrWidget,
      resolve: ({ attribs }) => ({ label: attribs['data-label'] }),
    });

    const node = {
      type: 'tag',
      tagName: 'nr-widget',
      attribs: { 'data-label': 'from-prop' },
      children: [],
    };

    const wrapper = mount(NodeRenderer, { propsData: { node } });
    expect(wrapper.find('em.nr').exists()).toBe(true);
    expect(wrapper.find('em.nr').text()).toBe('from-prop');
  });
});
