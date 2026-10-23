import { marked } from 'marked';
import hljs from 'highlight.js/lib/common';
import { escapeHtml } from '@/utils/html';

export const MARKED_OPTIONS = { breaks: true, gfm: true };

const renderer = {
  blockquote(token) {
    const inner = this.parser.parse(token.tokens);
    return `<blockquote class="md-blockquote">${inner}</blockquote>`;
  },

  code({ text, lang, raw }) {
    const language = hljs.getLanguage(lang) ? lang : 'plaintext';
    const highlighted = hljs.highlight(text, { language }).value;
    const langTag = lang ? `<div class="md-code-lang">${escapeHtml(lang)}</div>` : '';
    const lines = text.split('\n');
    const lineNumbers = lines.map((_, i) => `<span>${i + 1}</span>`).join('');
    // 未完全闭合的 code 可能混入反引号，完整性无法确认
    const lastLine = (raw || '').trimEnd().split('\n').pop().trim();
    const complete = /^(`{3,}|~{3,})/.test(lastLine);
    return `<div class="md-code-wrapper" data-lang="${escapeHtml(lang || language)}" data-complete="${~~complete}">${langTag}<div class="md-code-scroll"><div class="md-code-lines">${lineNumbers}</div><pre class="md-pre"><code class="md-code hljs language-${language}">${highlighted}</code></pre></div></div>`;
  },

  codespan({ text }) {
    return `<code class="md-code">${escapeHtml(text)}</code>`;
  },

  heading({ tokens, depth }) {
    const text = this.parser.parseInline(tokens);
    return `<h${depth} class="md-h${depth}">${text}</h${depth}>`;
  },

  hr() {
    return '<hr class="md-hr" />';
  },

  image({ href, title, text }) {
    return `<img class="md-img" src="${escapeHtml(href)}"${title ? ` title="${escapeHtml(title)}"` : ''} alt="${escapeHtml(text)}" />`;
  },

  link({ href, title, text }) {
    return `<a class="md-link" href="${escapeHtml(href)}"${title ? ` title="${escapeHtml(title)}"` : ''}>${text}</a>`;
  },

  list(token) {
    const tag = token.ordered ? 'ol' : 'ul';
    const start = token.ordered && token.start !== 1 ? ` start="${token.start}"` : '';
    const items = token.items.map((item) => this.listitem(item)).join('');
    return `<${tag} class="md-list"${start}>${items}</${tag}>`;
  },

  listitem(token) {
    const inner = this.parser.parse(token.tokens);
    return `<li class="md-li">${inner}</li>`;
  },

  paragraph({ tokens }) {
    const inner = this.parser.parseInline(tokens);
    return `<p class="md-p">${inner}</p>`;
  },

  table(token) {
    const header = `<tr>${token.header.map((cell) => this.tablecell(cell)).join('')}</tr>`;

    const body = token.rows.map((row) => `<tr>${row.map((cell) => this.tablecell(cell)).join('')}</tr>`).join('');

    return `
      <table class="md-table">
        <thead>${header}</thead>
        <tbody>${body}</tbody>
      </table>
    `;
  },

  tablerow(token) {
    return `<tr class="md-tr">${token.map((cell) => this.tablecell(cell)).join('')}</tr>`;
  },

  tablecell(token) {
    const tag = token.header ? 'th' : 'td';
    return `<${tag} class="md-${tag}">${this.parser.parseInline(token.tokens)}</${tag}>`;
  },
};

marked.use({ renderer });
marked.setOptions(MARKED_OPTIONS);

export { marked };
