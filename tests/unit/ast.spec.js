import { extractCode, findNode, getText, stringToFunction } from '@/utils/ast';

describe('findNode', () => {
  const tree = {
    type: 'tag',
    tagName: 'div',
    children: [
      { type: 'text', data: '前置文本' },
      {
        type: 'tag',
        tagName: 'section',
        children: [
          {
            type: 'tag',
            tagName: 'code',
            children: [{ type: 'text', data: 'const answer = 42;' }],
          },
        ],
      },
    ],
  };

  it('深度优先返回第一个满足条件的节点', () => {
    expect(findNode(tree, (node) => node.tagName === 'code')).toBe(tree.children[1].children[0]);
  });

  it('根节点不满足时返回 null', () => {
    expect(findNode({ type: 'text', data: 'plain' }, () => true)).toBeNull();
    expect(findNode(null, () => true)).toBeNull();
  });

  it('没有匹配节点时返回 null', () => {
    expect(findNode(tree, (node) => node.tagName === 'article')).toBeNull();
  });
});

describe('getText', () => {
  it('递归拼接所有文本节点', () => {
    const node = {
      type: 'tag',
      children: [
        { type: 'text', data: '第一行' },
        {
          type: 'tag',
          children: [{ type: 'text', data: '第二行' }],
        },
      ],
    };

    expect(getText(node)).toBe('第一行第二行');
  });

  it('文本节点直接返回 data，空节点返回空串', () => {
    expect(getText({ type: 'text', data: '文本' })).toBe('文本');
    expect(getText({ type: 'tag' })).toBe('');
    expect(getText(null)).toBe('');
  });
});

describe('extractCode', () => {
  it('提取嵌套 code 节点中的原始文本', () => {
    const pre = {
      type: 'tag',
      tagName: 'pre',
      children: [
        {
          type: 'tag',
          tagName: 'code',
          children: [
            { type: 'text', data: 'const answer = 42;\n' },
            { type: 'text', data: 'console.log(answer);' },
          ],
        },
      ],
    };

    expect(extractCode(pre)).toBe('const answer = 42;\nconsole.log(answer);');
  });

  it('没有 code 节点时返回空串', () => {
    expect(extractCode({ type: 'tag', tagName: 'pre', children: [] })).toBe('');
    expect(extractCode(null)).toBe('');
  });
});

describe('stringToFunction', () => {
  it('还原普通函数并保留返回值', () => {
    const fn = stringToFunction('function (p) { return p.name; }');

    expect(typeof fn).toBe('function');
    expect(fn({ name: 'alpha' })).toBe('alpha');
  });

  it('支持具名函数', () => {
    const fn = stringToFunction('function formatter(p) { return p.value; }');

    expect(fn({ value: 7 })).toBe(7);
  });

  it('支持箭头函数的表达式体、块体、零参与省略括号的单参', () => {
    expect(stringToFunction('(p) => p.name')({ name: 'a' })).toBe('a');
    expect(stringToFunction('p => p * 2')(21)).toBe(42);
    expect(stringToFunction('(p) => { return p + 1; }')(1)).toBe(2);
    expect(stringToFunction('() => 1')()).toBe(1);
    expect(stringToFunction('(a, b) => a + b')(1, 2)).toBe(3);
  });

  it('支持默认值、逗号分隔的默认值对象与解构参数', () => {
    const withDefault = stringToFunction('function (p, opt = { a: 1, b: 2 }) { return p + opt.a; }');
    expect(withDefault(1)).toBe(2);

    expect(stringToFunction('({ name }) => name')({ name: 'x' })).toBe('x');
  });

  it('容忍首尾空白与结尾分号', () => {
    expect(stringToFunction('  function (p) { return p; };\n')(3)).toBe(3);
    expect(stringToFunction('\n\t() => 0\n\n')()).toBe(0);
  });

  it('非法源码抛错，交由调用方回退', () => {
    expect(() => stringToFunction('')).toThrow();
    expect(() => stringToFunction('hello')).toThrow();
    expect(() => stringToFunction('function (p) { return p.name;')).toThrow();
  });
});
