import { extractCode, findNode, getText } from '@/utils/ast';

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
