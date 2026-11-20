/**
 * AST（htmlparser2 节点）通用工具。
 */

/** 深度优先查找第一个满足条件的子节点 */
export const findNode = (node, predicate) => {
  if (!node || node.type !== 'tag') return null;
  if (predicate(node)) return node;
  for (const child of node.children || []) {
    const hit = findNode(child, predicate);
    if (hit) return hit;
  }
  return null;
};

/** 递归提取节点下的全部文本（拼接 text 节点的 data） */
export const getText = (node) => {
  if (!node) return '';
  if (node.type === 'text') return node.data;
  return (node.children || []).map(getText).join('');
};

/** 在代码块包裹节点中提取原始代码文本 */
export const extractCode = (node) => {
  const codeNode = findNode(node, (n) => n.tagName === 'code');
  return codeNode ? getText(codeNode) : '';
};

/**
 * 把函数源码字符串还原成函数对象。
 * 包一层括号使其成为表达式，参数、箭头、默认值全部交给引擎解析，避免手写切片出错。
 */
export function stringToFunction(fnStr = '') {
  const src = String(fnStr)
    .trim()
    .replace(/[;\s]+$/, '');
  // 收尾换行：防止行尾注释把补上的右括号注释掉
  return new Function(`return (${src}\n)`)();
}
