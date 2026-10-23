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

// 重复注册时覆盖首次注册项，仅提示，便于发现同一语言/标签被多处注册
function warnDuplicate(kind, key) {
  console.warn(`[md/registry] ${kind} "${key}" 已注册，本次注册将覆盖旧的注册项`);
}

export function registerCodeBlockComp(lang, { component, resolve, toDocx }) {
  if (CODE_BLOCK_COMPONENTS.has(lang)) warnDuplicate('代码块渲染器', lang);
  CODE_BLOCK_COMPONENTS.set(lang, {
    component,
    resolve,
    toDocx,
    filter(node) {
      const attribs = node.attribs || {};
      return attribs['data-complete'] === '1';
    },
  });
}

export function registerTagComp(tag, { component, resolve, filter, toDocx }) {
  if (TAG_COMPONENTS.has(tag)) warnDuplicate('标签渲染器', tag);
  TAG_COMPONENTS.set(tag, { component, resolve, filter, toDocx });
}

// 渲染与导出共用同一套节点匹配规则：优先 data-lang（代码块），其次 tagName
function matchRenderer(node) {
  if (!node || node.type !== 'tag') return null;
  const attribs = node.attribs || {};
  const lang = attribs['data-lang'];
  const codeEntry = lang && CODE_BLOCK_COMPONENTS.get(lang);
  const entry = codeEntry || TAG_COMPONENTS.get(node.tagName);
  if (!entry) return null;
  const ctx = codeEntry ? { node, attribs, lang, code: extractCode(node) } : { node, attribs };
  // filter/resolve 由各注册方提供，出错时回退原生渲染，避免打断整棵渲染树
  try {
    if (entry.filter && !entry.filter(ctx)) return null;
    const props = entry.resolve ? entry.resolve(ctx) : attribs;
    return props == null ? null : { entry, props };
  } catch (err) {
    return null;
  }
}

export function resolveRenderer(node) {
  const matched = matchRenderer(node);
  return matched ? { component: matched.entry.component, props: matched.props } : null;
}

/**
 * 导出层入口：返回组件的 props（与 Vue 组件拿到的完全一致）和可选的 docx 转换器。
 * toDocx 缺省时由导出层降级为纯文本。
 */
export function resolveDocxRenderer(node) {
  const matched = matchRenderer(node);
  return matched ? { props: matched.props, toDocx: matched.entry.toDocx } : null;
}
