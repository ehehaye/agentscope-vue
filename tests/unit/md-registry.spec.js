import { registerCodeBlockComp, registerTagComp, resolveRenderer } from '@/components/md/registry';

/** 构造 htmlparser2 风格的 code block 节点 */
const codeNode = (lang, code, { complete = '1' } = {}) => ({
  type: 'tag',
  tagName: 'div',
  attribs: { 'data-lang': lang, 'data-complete': complete },
  children: [
    {
      type: 'tag',
      tagName: 'code',
      attribs: {},
      children: [{ type: 'text', data: code }],
    },
  ],
});

describe('resolveRenderer - 边界', () => {
  it('非 tag 节点或空节点返回 null', () => {
    expect(resolveRenderer(null)).toBeNull();
    expect(resolveRenderer({ type: 'text', data: 'x' })).toBeNull();
  });

  it('未注册的标签返回 null', () => {
    expect(resolveRenderer({ type: 'tag', tagName: 'div', attribs: {} })).toBeNull();
  });
});

describe('registerCodeBlockComp', () => {
  it('已完成的代码块解析为组件与 props', () => {
    const component = { name: 'FakeChart' };
    registerCodeBlockComp('test-echarts', {
      component,
      resolve: ({ lang, code }) => ({ option: JSON.parse(code), lang }),
    });

    const result = resolveRenderer(codeNode('test-echarts', '{"a":1}'));
    expect(result).toEqual({ component, props: { option: { a: 1 }, lang: 'test-echarts' } });
  });

  it('data-complete 非 1 时 filter 拦截', () => {
    registerCodeBlockComp('test-partial', {
      component: { name: 'X' },
      resolve: () => ({ ok: true }),
    });

    expect(resolveRenderer(codeNode('test-partial', 'code', { complete: '0' }))).toBeNull();
    // 注意：解构默认值对 undefined 生效，故用 null 表示“无 data-complete 属性”
    expect(resolveRenderer(codeNode('test-partial', 'code', { complete: null }))).toBeNull();
  });

  it('resolve 返回 null 时回退原生渲染', () => {
    registerCodeBlockComp('test-invalid', {
      component: { name: 'X' },
      resolve: () => null,
    });
    expect(resolveRenderer(codeNode('test-invalid', 'not json'))).toBeNull();
  });

  it('resolve 抛错时被捕获并回退原生渲染', () => {
    registerCodeBlockComp('test-throw', {
      component: { name: 'X' },
      resolve: () => {
        throw new Error('boom');
      },
    });
    expect(() => resolveRenderer(codeNode('test-throw', 'code'))).not.toThrow();
    expect(resolveRenderer(codeNode('test-throw', 'code'))).toBeNull();
  });

  it('重复注册同一 lang 覆盖旧配置', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    registerCodeBlockComp('test-override', { component: { name: 'First' }, resolve: () => ({ v: 1 }) });
    registerCodeBlockComp('test-override', { component: { name: 'Second' }, resolve: () => ({ v: 2 }) });

    const result = resolveRenderer(codeNode('test-override', 'code'));
    expect(result.component.name).toBe('Second');
    expect(result.props).toEqual({ v: 2 });
    warn.mockRestore();
  });

  it('重复注册同一 lang 时输出 warning', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    registerCodeBlockComp('test-warn-code', { component: { name: 'First' } });
    expect(warn).not.toHaveBeenCalled();

    registerCodeBlockComp('test-warn-code', { component: { name: 'Second' } });
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain('test-warn-code');
    warn.mockRestore();
  });
});

describe('registerTagComp', () => {
  it('自定义标签解析为组件，resolve 收到 node 与 attribs', () => {
    const component = { name: 'MyWidget' };
    registerTagComp('my-widget', {
      component,
      resolve: ({ attribs }) => ({ label: attribs['data-label'] }),
    });

    const node = { type: 'tag', tagName: 'my-widget', attribs: { 'data-label': 'hi' } };
    expect(resolveRenderer(node)).toEqual({ component, props: { label: 'hi' } });
  });

  it('未提供 resolve 时默认透传 attribs', () => {
    const component = { name: 'Bare' };
    registerTagComp('bare-tag', { component });
    const node = { type: 'tag', tagName: 'bare-tag', attribs: { id: 'x' } };
    expect(resolveRenderer(node)).toEqual({ component, props: { id: 'x' } });
  });

  it('filter 返回 false 时不渲染', () => {
    registerTagComp('filtered-tag', {
      component: { name: 'X' },
      filter: ({ attribs }) => attribs.show === 'yes',
    });
    expect(resolveRenderer({ type: 'tag', tagName: 'filtered-tag', attribs: {} })).toBeNull();
    expect(resolveRenderer({ type: 'tag', tagName: 'filtered-tag', attribs: { show: 'yes' } })?.component).toBeTruthy();
  });

  it('filter 抛错时被捕获', () => {
    registerTagComp('filter-throw-tag', {
      component: { name: 'X' },
      filter: () => {
        throw new Error('boom');
      },
    });
    expect(resolveRenderer({ type: 'tag', tagName: 'filter-throw-tag', attribs: {} })).toBeNull();
  });

  it('重复注册同一 tag 时输出 warning', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    registerTagComp('test-warn-tag', { component: { name: 'First' } });
    expect(warn).not.toHaveBeenCalled();

    registerTagComp('test-warn-tag', { component: { name: 'Second' } });
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain('test-warn-tag');
    warn.mockRestore();
  });

  it('代码块注册优先于同名标签注册', () => {
    registerTagComp('dual', { component: { name: 'TagComp' }, resolve: () => ({ from: 'tag' }) });
    registerCodeBlockComp('dual', { component: { name: 'CodeComp' }, resolve: () => ({ from: 'code' }) });

    const viaCode = resolveRenderer(codeNode('dual', 'code'));
    expect(viaCode.component.name).toBe('CodeComp');
    expect(viaCode.props).toEqual({ from: 'code' });

    // 同样是 dual 标签，但无 data-lang → 走标签注册
    const viaTag = resolveRenderer({ type: 'tag', tagName: 'dual', attribs: {} });
    expect(viaTag.component.name).toBe('TagComp');
  });
});
