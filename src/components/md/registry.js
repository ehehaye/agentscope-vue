/**
 * Markdown 自定义渲染组件注册表（配置文件）
 *
 * 两类注册：
 *  1. registerCodeBlockComp(lang)：```lang 代码块整体替换为组件，resolve 入参含提取好的 code
 *     示例：
 *     ```echarts
 *     {"xAxis":{"type":"category","data":["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]},"yAxis":{"type":"value"},"series":[{"data":[150,230,224,218,135,147,260],"type":"line"}]}
 *     ```
 *  2. registerTagComp(tag)：<my-tag> 映射为组件（可覆盖 a、p 等原生标签，子节点经默认插槽透传）
 */
import { extractCode } from '@/utils/ast';

const CODE_BLOCK_COMPONENTS = new Map();
const TAG_COMPONENTS = new Map();

export function registerCodeBlockComp(lang, { component, resolve }) {
  CODE_BLOCK_COMPONENTS.set(lang, {
    component,
    resolve,
    filter(node) {
      const attribs = node.attribs || {};
      return attribs['data-complete'] === '1';
    },
  });
}

export function registerTagComp(tag, { component, resolve, filter }) {
  TAG_COMPONENTS.set(tag, { component, resolve, filter });
}

export function resolveRenderer(node) {
  if (!node || node.type !== 'tag') return null;
  const attribs = node.attribs || {};
  const lang = attribs['data-lang'];
  const codeEntry = lang && CODE_BLOCK_COMPONENTS.get(lang);
  const entry = codeEntry || TAG_COMPONENTS.get(node.tagName);
  if (!entry) return null;
  const ctx = codeEntry ? { node, attribs, lang, code: extractCode(node) } : { node, attribs };
  if (entry.filter && !entry.filter(ctx)) return null;
  const props = entry.resolve ? entry.resolve(ctx) : attribs;
  return props == null ? null : { component: entry.component, props };
}
