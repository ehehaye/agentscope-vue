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
