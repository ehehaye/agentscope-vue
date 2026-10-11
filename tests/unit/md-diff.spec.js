import diff from '@/components/md/diff';

/**
 * diff 是 Options API mixin，方法只依赖 this 上的 data 字段，
 * 这里构造一个轻量宿主对象直接调用，避免挂载组件。
 */
const createGetter = (content = '') => Object.assign({ content }, diff.data(), diff.methods);

describe('findStableBoundary', () => {
  it('内容过短时不做切分', () => {
    expect(createGetter().findStableBoundary('abc')).toBe(0);
    expect(createGetter().findStableBoundary('')).toBe(0);
  });

  it('返回最后一个空行之后的偏移（即 stable 长度）', () => {
    const content = 'one\n\ntwo';
    expect(createGetter().findStableBoundary(content)).toBe(5);
    expect(content.slice(0, 5)).toBe('one\n\n');
  });

  it('多个空行时取最后一个', () => {
    const content = 'a\n\nb\n\nc';
    // 最后一个空行在 "a\n\nb\n" 之后 → 偏移 6
    expect(createGetter().findStableBoundary(content)).toBe(6);
    expect(content.slice(6)).toBe('c');
  });

  it('忽略 fenced code block 内部的空行', () => {
    const content = '```js\n\ncode\n```\n\nafter';
    const boundary = createGetter().findStableBoundary(content);
    // 只有 fence 结束后的空行是边界，fence 内的空行不算
    expect(boundary).toBe(17);
    expect(content.slice(boundary)).toBe('after');
  });

  it('只含 fence 内空行时边界为 0', () => {
    const content = '```\n\ninside\n```';
    expect(createGetter().findStableBoundary(content)).toBe(0);
  });

  it('支持 ~~~ fence', () => {
    const content = '~~~\n\ninside\n~~~\n\nout';
    expect(createGetter().findStableBoundary(content)).toBe(content.indexOf('out'));
  });
});

describe('findStableBoundaryCached', () => {
  it('首次调用扫描并缓存边界', () => {
    const g = createGetter();
    const content = 'one\n\ntwo';
    expect(g.findStableBoundaryCached(content)).toBe(5);
    expect(g.incrementalLastBoundary).toBe(5);
  });

  it('纯追加且 tail 未超阈值时命中缓存，不重扫', () => {
    const g = createGetter();
    // 人为把缓存边界设为 3，若命中缓存应直接返回 3 而非真实边界 5
    g.incrementalLastBoundary = 3;
    expect(g.findStableBoundaryCached('one\n\ntwo')).toBe(3);
  });

  it('tail 超过阈值时重扫', () => {
    const g = createGetter();
    g.incrementalLastBoundary = 0;
    const content = 'a\n\n' + 'x'.repeat(5000);
    expect(g.findStableBoundaryCached(content)).toBe(3);
  });

  it('整段替换时清空缓存并重扫', () => {
    const g = createGetter();
    g.incrementalStablePrefix = '旧的稳定前缀\n\n';
    g.incrementalStablePrefixHtml = '<p>old</p>';
    g.incrementalLastBoundary = 999;
    expect(g.findStableBoundaryCached('one\n\ntwo')).toBe(5);
    expect(g.incrementalStablePrefix).toBe('');
    expect(g.incrementalStablePrefixHtml).toBe('');
  });

  it('仍以旧前缀开头时不清缓存', () => {
    const g = createGetter();
    g.incrementalStablePrefix = 'one\n\n';
    g.incrementalStablePrefixHtml = '<p>one</p>';
    g.incrementalLastBoundary = 5;
    expect(g.findStableBoundaryCached('one\n\ntwo')).toBe(5);
    expect(g.incrementalStablePrefix).toBe('one\n\n');
  });
});

describe('getHtml', () => {
  it('空内容返回空串', () => {
    expect(createGetter('').getHtml()).toBe('');
    expect(createGetter(undefined).getHtml()).toBe('');
  });

  it('渲染基础 markdown 为 HTML', () => {
    const html = createGetter('hello').getHtml();
    expect(html).toContain('hello');
    expect(html).toContain('<p>');
  });

  it('多段内容整体拼接输出', () => {
    const html = createGetter('one\n\ntwo').getHtml();
    expect(html).toContain('one');
    expect(html).toContain('two');
  });

  it('strip 掉危险标签（sanitize 在拼接后整体执行）', () => {
    const html = createGetter('safe\n\n<script>alert(1)</script>').getHtml();
    expect(html).not.toContain('<script');
  });

  it('稳定前缀在纯追加时复用缓存 HTML', () => {
    const g = createGetter('stable para\n\ntail');
    g.getHtml();
    const cached = g.incrementalStablePrefixHtml;
    expect(g.incrementalStablePrefix).toBe('stable para\n\n');

    // 纯追加：边界被缓存，stable 不变 → 复用同一缓存字符串
    g.content = 'stable para\n\ntail more';
    g.getHtml();
    expect(g.incrementalStablePrefixHtml).toBe(cached);
  });

  it('纯追加时边界保持缓存（tail 未超阈值不重扫）', () => {
    const g = createGetter('one\n\ntwo');
    g.getHtml();
    g.content = 'one\n\ntwo\n\nthree';
    const html = g.getHtml();
    // 边界仍是第一个空行之后，stable 前缀不变，新块留在 tail 中重算
    expect(g.incrementalStablePrefix).toBe('one\n\n');
    expect(html).toContain('three');
  });

  it('内容整段替换时清缓存并重新解析稳定前缀', () => {
    const g = createGetter('one\n\ntwo');
    g.getHtml();
    const first = g.incrementalStablePrefixHtml;
    g.content = 'different\n\ncontent';
    const html = g.getHtml();
    expect(g.incrementalStablePrefix).toBe('different\n\n');
    expect(g.incrementalStablePrefixHtml).not.toBe(first);
    expect(html).toContain('content');
  });
});
