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

  code({ text, lang }) {
    const language = hljs.getLanguage(lang) ? lang : 'plaintext';
    const highlighted = hljs.highlight(text, { language }).value;
    const langTag = lang ? `<div class="md-code-lang">${escapeHtml(lang)}</div>` : '';
    const lines = text.split('\n');
    const lineNumbers = lines.map((_, i) => `<span>${i + 1}</span>`).join('');
    return `<div class="md-code-wrapper" data-lang="${lang || language}">${langTag}<div class="md-code-scroll"><div class="md-code-lines">${lineNumbers}</div><pre class="md-pre"><code class="md-code hljs language-${language}">${highlighted}</code></pre></div></div>`;
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
    // 打字机模式：displayContent 滞后于 content，逐帧追赶，实现平滑输出
    typewriter: {
      type: Boolean,
      default: false,
    },
    // 打字机速度倍率，默认 0.5；越大越快（同时影响追帧灵敏度与每帧吐字上限）
    speed: {
      type: Number,
      default: 0.5,
    },
  },
  data() {
    return {
      htmlRafId: null,
      twRafId: null,
      astTree: [],
      displayContent: '',
      // 是否已完成首次同步：首次内容（含历史回填）直接渲染，不走打字机
      initialized: false,
    };
  },
  watch: {
    content: {
      handler(val) {
        // 首次渲染（含历史回填）直接同步，不做动画。
        // 注意：此时 displayContent 为空串，startsWith('') 恒为 true，无法用追加判断区分，故用显式标记
        if (!this.typewriter || !this.initialized) {
          this.initialized = true;
          this.stopTypewriter();
          this.displayContent = val;
          this.updateAstTree();
          return;
        }
        // 非纯追加（整段替换）时直接同步，不做动画
        if (!val.startsWith(this.displayContent)) {
          this.stopTypewriter();
          this.displayContent = val;
          this.updateAstTree();
          return;
        }
        this.scheduleTypewriter();
      },
      immediate: true,
    },
  },
  beforeDestroy() {
    if (this.htmlRafId) {
      cancelAnimationFrame(this.htmlRafId);
    }
    this.stopTypewriter();
  },
  methods: {
    stopTypewriter() {
      if (this.twRafId) {
        cancelAnimationFrame(this.twRafId);
        this.twRafId = null;
      }
    },
    scheduleTypewriter() {
      if (this.twRafId) {
        return;
      }
      const step = () => {
        this.twRafId = null;
        const target = this.content.length;
        const current = this.displayContent.length;
        const backlog = target - current;
        if (backlog <= 0) {
          return;
        }
        // 自适应速度：积压越多每帧吐字越多，平滑的同时保证追得上流式速度；speed 为整体倍率
        const speed = this.speed > 0 ? this.speed : 1;
        const stepChars = Math.min(Math.max(Math.ceil((backlog / 12) * speed), 1), Math.ceil(24 * speed));
        this.displayContent = this.content.slice(0, current + stepChars);
        this.updateAstTree();
        this.twRafId = requestAnimationFrame(step);
      };
      this.twRafId = requestAnimationFrame(step);
    },
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
