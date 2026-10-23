import { parseDocument } from 'htmlparser2';
import { resolveDocxRenderer } from '@/components/md/registry';
import { renderMarkdownToHtml } from '@/components/md/render';
import { extractCode, getText } from '@/utils/ast';
import { renderEchartsDataUrl } from '@/components/echarts/image';
import { triggerDownload } from '@/utils/file';

/**
 * Markdown → .docx 导出。
 *
 * 输入与渲染层共用同一份「md → 消毒 HTML」（components/md/render.js），
 * 因此自定义节点的识别规则只有一份：registry 按 data-lang（代码块）或
 * tagName（标签）匹配，注册时提供了 toDocx 的组件自行决定如何落成 Word 元素。
 *
 * 分派顺序：
 *   1. registry 的 toDocx（echarts 等）
 *   2. 内置 HTML 标签映射（标题/段落/列表/表格/代码块…）
 *   3. 未识别的标签递归子节点，最终由纯文本兜底
 */

const MONO_FONT = 'Courier New';
const CODE_FILL = 'F6F8FA';
const ORDERED_LIST_REFERENCE = 'md-ordered-list';

// list item 内出现这些标签时按块级处理，其余视为行内内容
const BLOCK_TAGS = new Set([
  'p',
  'ul',
  'ol',
  'pre',
  'blockquote',
  'table',
  'div',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'hr',
]);

const QUOTE_BORDER_COLOR = '409EFF';

function normalizeBlocks(value) {
  if (value == null) return [];
  return Array.isArray(value) ? value.flat() : [value];
}

// docx 由调用方动态 import 后传入，转换器内部不持有模块级状态，便于按需加载
function createConverter(docx) {
  const {
    AlignmentType,
    BorderStyle,
    HeadingLevel,
    ImageRun,
    LevelFormat,
    Paragraph,
    Table,
    TableCell,
    TableRow,
    TextRun,
    WidthType,
  } = docx;

  const QUOTE_PROPS = {
    indent: { left: 400 },
    border: { left: { style: BorderStyle.SINGLE, size: 12, color: QUOTE_BORDER_COLOR } },
  };

  const HEADING_LEVELS = [
    HeadingLevel.HEADING_1,
    HeadingLevel.HEADING_2,
    HeadingLevel.HEADING_3,
    HeadingLevel.HEADING_4,
    HeadingLevel.HEADING_5,
    HeadingLevel.HEADING_6,
  ];

  const orderedListDefinition = {
    reference: ORDERED_LIST_REFERENCE,
    levels: Array.from({ length: 9 }, (_, level) => ({
      level,
      format: LevelFormat.DECIMAL,
      text: `%${level + 1}.`,
      alignment: AlignmentType.START,
    })),
  };

  // 每个顶层有序列表独立计数，对应一个 numbering instance（重新从 1 开始）；
  // 嵌套有序列表复用父列表的 instance，保证多级编号连续
  let orderedListInstance = 0;

  // 引用块内的所有块级元素统一加左缩进和左侧竖线
  const stateProps = (state, extra = {}) => ({ ...(state.quote ? QUOTE_PROPS : {}), ...extra });

  function paragraph(runs, state, extra = {}) {
    return new Paragraph({
      ...stateProps(state, extra),
      children: runs.length ? runs : [new TextRun({ text: '' })],
    });
  }

  // 行内节点 → TextRun[]：样式随嵌套层级向下累积（加粗里套斜体等）
  function inlineRuns(nodes, flags = {}) {
    const runs = [];
    for (const node of nodes || []) {
      if (node.type === 'text') {
        if (node.data) runs.push(new TextRun({ ...flags, text: node.data }));
        continue;
      }
      if (node.type !== 'tag') continue;
      switch (node.tagName) {
        case 'strong':
        case 'b':
          runs.push(...inlineRuns(node.children, { ...flags, bold: true }));
          break;
        case 'em':
        case 'i':
          runs.push(...inlineRuns(node.children, { ...flags, italics: true }));
          break;
        case 'del':
        case 's':
        case 'strike':
          runs.push(...inlineRuns(node.children, { ...flags, strike: true }));
          break;
        case 'code':
          runs.push(new TextRun({ ...flags, text: getText(node), font: MONO_FONT, shading: { fill: 'F2F2F2' } }));
          break;
        case 'a':
          runs.push(...inlineRuns(node.children, { ...flags, color: '0563C1', underline: {} }));
          break;
        case 'br':
          runs.push(new TextRun({ ...flags, break: 1 }));
          break;
        case 'img':
          runs.push(
            new TextRun({ ...flags, text: `[图片：${node.attribs.alt || node.attribs.src || ''}]`, italics: true }),
          );
          break;
        default:
          runs.push(...inlineRuns(node.children, flags));
      }
    }
    return runs;
  }

  // 用行内 break 而不是拆成多个 Paragraph，保证代码块的底色和行距连续
  function codeBlock(text) {
    const lines = (text || '').split('\n');
    const runs = lines.map(
      (line, index) => new TextRun({ text: line, font: MONO_FONT, size: 18, break: index === 0 ? 0 : 1 }),
    );
    const border = { style: BorderStyle.SINGLE, size: 4, color: 'E4E7ED' };
    return new Paragraph({
      children: runs,
      shading: { fill: CODE_FILL },
      spacing: { before: 120, after: 120 },
      indent: { left: 200, right: 200 },
      border: { top: border, bottom: border, left: border, right: border },
    });
  }

  function collectRows(node, rows) {
    for (const child of node.children || []) {
      if (child.type !== 'tag') continue;
      if (child.tagName === 'tr') rows.push(child);
      else if (['thead', 'tbody', 'tfoot'].includes(child.tagName)) collectRows(child, rows);
    }
  }

  // 整行都是 th 才当作表头（GFM 表格的 thead 语义），表头加粗 + 灰底
  function tableFromNode(node) {
    const rowNodes = [];
    collectRows(node, rowNodes);
    if (!rowNodes.length) return null;
    const rows = rowNodes.map((tr) => {
      const cells = (tr.children || []).filter((n) => n.type === 'tag' && (n.tagName === 'th' || n.tagName === 'td'));
      const header = cells.length > 0 && cells.every((cell) => cell.tagName === 'th');
      return new TableRow({
        tableHeader: header,
        children: cells.map(
          (cell) =>
            new TableCell({
              shading: header ? { fill: 'F2F2F2' } : undefined,
              children: [paragraph(inlineRuns(cell.children, { bold: header }), {})],
            }),
        ),
      });
    });
    return new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE } });
  }

  function imageParagraph(data, { width = 600, height = 400, type = 'png' } = {}) {
    return new Paragraph({
      children: [new ImageRun({ type, data, transformation: { width, height } })],
    });
  }

  // 注册组件的 docx 能力入口；组件实现只依赖这些原语，不直接 import docx
  const api = {
    table: tableFromNode,
    codeBlock,
    inlineRuns,
    image: imageParagraph,
    renderEcharts(option, opts = {}) {
      // 按 800×400 离屏渲染，再等比缩到正文宽度（最多 600px），避免图表在 Word 里溢出
      const renderWidth = opts.width || 800;
      const renderHeight = opts.height || 400;
      const displayWidth = Math.min(opts.displayWidth || 600, 600);
      const dataUrl = renderEchartsDataUrl(option, { width: renderWidth, height: renderHeight });
      if (!dataUrl) return null;
      return imageParagraph(dataUrl, {
        width: displayWidth,
        height: Math.round((displayWidth * renderHeight) / renderWidth),
      });
    },
  };

  async function listBlocks(node, state, level, instance) {
    const ordered = node.tagName === 'ol';
    const currentInstance = ordered ? (instance ?? ++orderedListInstance) : undefined;
    const out = [];
    const items = (node.children || []).filter((n) => n.type === 'tag' && n.tagName === 'li');
    for (const li of items) {
      const inlineNodes = [];
      const blockNodes = [];
      // li 里的 <p> 视为行内内容，其余块级节点递归处理；
      // 嵌套列表降一级，并从父列表继承编号实例
      for (const child of li.children || []) {
        if (child.type === 'tag' && child.tagName === 'p') inlineNodes.push(...(child.children || []));
        else if (child.type === 'tag' && BLOCK_TAGS.has(child.tagName)) blockNodes.push(child);
        else if (child.type === 'text' && !child.data.trim()) continue;
        else inlineNodes.push(child);
      }
      out.push(
        paragraph(
          inlineRuns(inlineNodes),
          state,
          ordered
            ? { numbering: { reference: ORDERED_LIST_REFERENCE, level, instance: currentInstance } }
            : { bullet: { level } },
        ),
      );
      for (const child of blockNodes) {
        const childState = { ...state, listLevel: level + 1, listInstance: ordered ? currentInstance : undefined };
        out.push(...(await nodeBlocks(child, childState)));
      }
    }
    return out;
  }

  async function nodeBlocks(node, state) {
    if (node.type === 'text') {
      const text = node.data.trim();
      return text ? [paragraph([new TextRun({ text })], state, { spacing: { after: 120 } })] : [];
    }
    if (node.type !== 'tag') return [];

    // 自定义组件优先：与渲染层共用 registry 匹配规则（data-lang / tagName）
    const custom = resolveDocxRenderer(node);
    if (custom?.toDocx) {
      const produced = normalizeBlocks(await custom.toDocx(custom.props, api));
      if (produced.length) return produced;
      // 转换器未产出内容时继续走原生映射，最终由 default 分支兜底为文本
    }

    switch (node.tagName) {
      case 'h1':
      case 'h2':
      case 'h3':
      case 'h4':
      case 'h5':
      case 'h6':
        return [
          paragraph(inlineRuns(node.children), state, {
            heading: HEADING_LEVELS[Number(node.tagName[1]) - 1],
            spacing: { before: 240, after: 120 },
          }),
        ];
      case 'p':
        return [paragraph(inlineRuns(node.children), state, { spacing: { after: 120 } })];
      case 'blockquote':
        return blocks(node.children, { ...state, quote: true });
      case 'ul':
      case 'ol':
        return listBlocks(node, state, state.listLevel || 0, state.listInstance);
      case 'li':
        return blocks(node.children, state);
      case 'table': {
        const table = tableFromNode(node);
        return table ? [table] : [];
      }
      case 'pre':
        return [codeBlock(extractCode(node) || getText(node))];
      case 'div':
        // 未注册的代码块（含流式中未闭合的）仍按代码文本导出
        if (node.attribs['data-lang'] || /(^|\s)md-code-wrapper(\s|$)/.test(node.attribs.class || '')) {
          return [codeBlock(extractCode(node) || getText(node))];
        }
        return blocks(node.children, state);
      case 'hr':
        return [
          new Paragraph({
            spacing: { before: 120, after: 120 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'DCDFE6' } },
          }),
        ];
      case 'img':
        return [
          paragraph(
            [new TextRun({ text: `[图片：${node.attribs.alt || node.attribs.src || ''}]`, italics: true })],
            state,
            { spacing: { after: 120 } },
          ),
        ];
      case 'br':
        return [];
      default:
        return blocks(node.children, state);
    }
  }

  async function blocks(nodes, state = {}) {
    const out = [];
    for (const node of nodes || []) {
      out.push(...(await nodeBlocks(node, state)));
    }
    return out;
  }

  return { blocks, orderedListDefinition };
}

/**
 * 将 Markdown 源码转换为 .docx 并触发下载
 *
 * @param {string} markdown - Markdown 原文
 * @param {string} [filename] - 文件名，缺省为 export-YYYYMMDD-HHmmss.docx
 */
export async function downloadDocxFromMarkdown(markdown, filename) {
  const name = filename || `export-${new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)}.docx`;
  // docx 依赖在导出时按需加载，避免进入首屏包
  const docx = await import('docx');
  const converter = createConverter(docx);
  const html = renderMarkdownToHtml(markdown);
  const children = await converter.blocks(parseDocument(html).children);
  // 空文档补一个空段落，避免生成 Word 打不开的 section
  const doc = new docx.Document({
    numbering: { config: [converter.orderedListDefinition] },
    sections: [{ children: children.length ? children : [new docx.Paragraph({})] }],
  });
  const blob = await docx.Packer.toBlob(doc);
  triggerDownload(blob, name);
}
