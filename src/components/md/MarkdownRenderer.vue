<template>
  <div class="markdown-renderer">
    <NodeRenderer
      v-for="(node, index) in astTree"
      :key="index"
      :node="node"
    />
  </div>
</template>

<script>
import { defineComponent } from '@/composables/vue';
import { marked } from 'marked';
import hljs from 'highlight.js/lib/common';
import { parseDocument } from 'htmlparser2';
import NodeRenderer from './NodeRenderer.vue';
import diff from './diff';

/** 属性级转义：token 内容拼入 HTML 属性前统一转义，不依赖最终 DOMPurify 兜底。 */
const escapeHtml = (value) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (ch) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[ch],
  );

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
    return `<div class="md-code-wrapper" data-lang="${lang || language}" data-complete="${~~complete}">${langTag}<div class="md-code-scroll"><div class="md-code-lines">${lineNumbers}</div><pre class="md-pre"><code class="md-code hljs language-${language}">${highlighted}</code></pre></div></div>`;
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
marked.setOptions({ breaks: true, gfm: true });

export default defineComponent({
  name: 'MarkdownRenderer',
  mixins: [diff],
  components: {
    NodeRenderer,
  },
  props: {
    content: {
      type: String,
      default: '',
    },
  },
  data() {
    return {
      htmlRafId: null,
      astTree: [],
    };
  },
  watch: {
    content: {
      handler() {
        this.updateAstTree();
      },
      immediate: true,
    },
  },
  beforeDestroy() {
    if (this.htmlRafId) {
      cancelAnimationFrame(this.htmlRafId);
    }
  },
  methods: {
    updateAstTree() {
      if (this.htmlRafId) {
        cancelAnimationFrame(this.htmlRafId);
      }
      this.htmlRafId = requestAnimationFrame(() => {
        this.htmlRafId = null;
        const html = this.getHtml();
        if (this.lastHtml === html) {
          return;
        }
        this.lastHtml = html;
        // 把 HTML 转成 vNode 树，让每次内容变化只触发 Vue diff 做增量更新。
        this.astTree = html ? parseDocument(html).children : [];
      });
    },
  },
});
</script>

<style lang="less">
.markdown-renderer {
  line-height: 1.8;
  color: @text-color;

  .md-h1,
  .md-h2,
  .md-h3,
  .md-h4,
  .md-h5,
  .md-h6 {
    margin-top: @spacing-md;
    margin-bottom: @spacing-sm;
    font-weight: 600;
    line-height: 1.3;
  }

  .md-h1 {
    font-size: 28px;
    border-bottom: 1px solid @border-color;
    padding-bottom: @spacing-sm;
  }

  .md-h2 {
    font-size: 24px;
  }

  .md-h3 {
    font-size: 20px;
  }

  .md-p {
    margin: @spacing-sm 0;
  }

  .md-list {
    padding-left: @spacing-lg;
    margin: @spacing-sm 0;
  }

  .md-li {
    margin: @spacing-xs 0;
  }

  .md-code {
    background-color: @code-bg;
    padding: 2px 6px;
    border-radius: @border-radius-sm;
    font-family: 'Courier New', monospace;
    font-size: 0.9em;
  }

  .md-code-wrapper {
    background-color: @code-bg;
    border-radius: @border-radius-md;
    overflow: hidden;
    margin: @spacing-xs 0;

    .md-code-lang {
      text-align: left;
      font-size: 12px;
      color: @text-secondary;
      padding: 4px @spacing-sm;
      border-bottom: 1px solid @border-color;
    }

    .md-code-scroll {
      display: flex;
      overflow-x: hidden;
    }

    .md-code-lines {
      padding: @spacing-xs @spacing-sm;
      border-right: 1px solid @border-color;
      background-color: @surface-muted;
      user-select: none;
      min-width: 40px;
      text-align: right;

      span {
        display: block;
        font-size: 14px;
        line-height: 1.5;
        color: @text-secondary;
        font-family: 'Courier New', monospace;
      }
    }

    .md-pre {
      background: none;
      padding: @spacing-xs;
      margin: 0;
      flex: 1;
      overflow-x: auto;

      .md-code {
        background: none;
        padding: 0;
        font-size: 14px;
        line-height: 1.5;
      }
    }
  }

  .md-blockquote {
    border-left: 4px solid @primary-color;
    padding-left: @spacing-md;
    margin: @spacing-md 0;
    color: @text-secondary;
  }

  .md-table {
    width: 100%;
    border-collapse: collapse;
    margin: @spacing-md 0;

    .md-th,
    .md-td {
      border: 1px solid @border-color;
      padding: @spacing-sm @spacing-md;
      text-align: left;
    }

    .md-th {
      background-color: @surface-muted;
      font-weight: 600;
    }
  }

  .md-link {
    color: @primary-color;
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }

  .md-img {
    max-width: 100%;
    height: auto;
  }

  .md-hr {
    border: none;
    border-top: 1px solid @border-color;
    margin: @spacing-lg 0;
  }

  @import (less) '~highlight.js/styles/1c-light.css';
}

.dark .markdown-renderer {
  @import (less) '~highlight.js/styles/github-dark.css';
}
</style>
