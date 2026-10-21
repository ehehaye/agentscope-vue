import { mount } from '@vue/test-utils';
import MarkdownRenderer from '@/components/md/MarkdownRenderer.vue';

/**
 * 首次渲染同步执行，之后按渲染间隔合并解析；
 * 内容更新相关用例用假定时器推进到下一次解析。
 */
const render = (content) => mount(MarkdownRenderer, { propsData: { content } });

describe('MarkdownRenderer 基础结构', () => {
  it('始终渲染根容器，空内容不产生节点', () => {
    const wrapper = render('');
    expect(wrapper.find('.markdown-renderer').exists()).toBe(true);
    expect(wrapper.find('.markdown-renderer').text()).toBe('');
    expect(wrapper.vm.astTree).toEqual([]);
  });

  it('渲染段落与行内样式', () => {
    const wrapper = render('hello **world**');
    expect(wrapper.find('p.md-p').exists()).toBe(true);
    expect(wrapper.find('p.md-p').html()).toContain('<strong>world</strong>');
  });
});

describe('MarkdownRenderer 块级元素', () => {
  it('标题带层级类名', () => {
    const wrapper = render('# Title');
    expect(wrapper.find('h1.md-h1').text()).toBe('Title');
  });

  it('列表使用 md-list / md-li 类名', () => {
    const wrapper = render('- a\n- b');
    expect(wrapper.find('ul.md-list').exists()).toBe(true);
    expect(wrapper.findAll('li.md-li')).toHaveLength(2);
  });

  it('有序列表从指定序号开始', () => {
    const wrapper = render('3. c\n4. d');
    const ol = wrapper.find('ol.md-list');
    expect(ol.exists()).toBe(true);
    expect(ol.attributes('start')).toBe('3');
  });

  it('引用块与分割线', () => {
    const quote = render('> note');
    expect(quote.find('blockquote.md-blockquote').text()).toContain('note');

    const hr = render('---');
    expect(hr.find('hr.md-hr').exists()).toBe(true);
  });

  it('表格带 md-table / md-th / md-td 类名', () => {
    const wrapper = render('| a | b |\n| - | - |\n| 1 | 2 |');
    expect(wrapper.find('table.md-table').exists()).toBe(true);
    expect(wrapper.findAll('th.md-th')).toHaveLength(2);
    expect(wrapper.findAll('td.md-td')).toHaveLength(2);
  });

  it('链接与图片带对应类名并转义属性', () => {
    const wrapper = render('[site](http://example.com "标题") ![alt](http://img.png)');
    const link = wrapper.find('a.md-link');
    expect(link.attributes('href')).toBe('http://example.com');
    expect(link.attributes('title')).toBe('标题');

    const img = wrapper.find('img.md-img');
    expect(img.attributes('src')).toBe('http://img.png');
    expect(img.attributes('alt')).toBe('alt');
  });
});

describe('MarkdownRenderer 代码块', () => {
  it('代码块渲染带语言、行号与高亮', () => {
    const wrapper = render('```js\nconst a = 1;\n```');
    const box = wrapper.find('.md-code-wrapper');
    expect(box.exists()).toBe(true);
    expect(box.attributes('data-lang')).toBe('js');
    expect(box.find('.md-code-lang').text()).toBe('js');
    expect(box.findAll('.md-code-lines span').length).toBeGreaterThan(0);
    expect(box.find('pre.md-pre code.hljs').exists()).toBe(true);
  });

  it('行内代码使用 md-code 类名', () => {
    const wrapper = render('use `npm install` now');
    expect(wrapper.find('code.md-code').text()).toBe('npm install');
  });
});

describe('MarkdownRenderer 安全与更新', () => {
  it('移除 script 等危险内容', () => {
    const wrapper = render('safe\n\n<script>alert(1)</script>');
    expect(wrapper.html()).not.toContain('<script');
    expect(wrapper.text()).toContain('safe');
  });

  it('content 变化后按渲染间隔重新解析并渲染', async () => {
    jest.useFakeTimers();
    const wrapper = render('first');
    expect(wrapper.text()).toContain('first');

    await wrapper.setProps({ content: 'second **bold**' });
    // 间隔未到，仍显示旧内容
    expect(wrapper.text()).toContain('first');

    jest.advanceTimersByTime(200);
    await wrapper.vm.$nextTick();
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain('second');
    expect(wrapper.find('strong').text()).toBe('bold');
    jest.useRealTimers();
  });

  it('销毁时清理未执行的渲染定时器', async () => {
    jest.useFakeTimers();
    const wrapper = render('text');

    await wrapper.setProps({ content: 'text more' });
    expect(jest.getTimerCount()).toBeGreaterThan(0);

    wrapper.destroy();
    expect(jest.getTimerCount()).toBe(0);
    jest.useRealTimers();
  });
});
