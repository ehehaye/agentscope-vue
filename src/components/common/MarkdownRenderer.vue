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
import { defineComponent } from '@/composables/vue'
import DOMPurify from 'dompurify'
import remend from "remend"
import { marked } from 'marked'
import hljs from 'highlight.js/lib/common'
import vsCss from 'highlight.js/styles/vs.css?url'
import githubDarkCss from 'highlight.js/styles/github-dark.css?url'
import { parseDocument } from 'htmlparser2'
import NodeRenderer from './NodeRenderer.vue'

// 动态切换 hljs 主题：浅色 vs.css / 深色 github-dark.css
// CSS 静态导入无法按运行时主题切换，故用 <link> 注入，监听 <html>.dark 类变化。
const HLJS_LINK_ID = 'hljs-theme-stylesheet'
function applyHljsTheme() {
  const isDark = document.documentElement.classList.contains('dark')
  const href = isDark ? githubDarkCss : vsCss
  let link = document.getElementById(HLJS_LINK_ID)
  if (!link) {
    link = document.createElement('link')
    link.id = HLJS_LINK_ID
    link.rel = 'stylesheet'
    document.head.appendChild(link)
  }
  if (link.getAttribute('href') !== href) {
    link.setAttribute('href', href)
  }
}
applyHljsTheme()
if (typeof MutationObserver !== 'undefined') {
  new MutationObserver(() => applyHljsTheme()).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
  })
}

// https://marked.js.org/using_pro#renderer
const renderer = {
  blockquote(token) {
    const inner = this.parser.parse(token.tokens)
    return `<blockquote class="md-blockquote">${inner}</blockquote>`
  },

  code({ text, lang }) {
    const language = hljs.getLanguage(lang) ? lang : 'plaintext'
    const highlighted = hljs.highlight(text, { language }).value
    const langTag = lang ? `<div class="md-code-lang">${lang}</div>` : ''
    const lines = text.split('\n')
    const lineNumbers = lines.map((_, i) => `<span>${i + 1}</span>`).join('')
    return `<div class="md-code-wrapper">${langTag}<div class="md-code-scroll"><div class="md-code-lines">${lineNumbers}</div><pre class="md-pre"><code class="md-code hljs language-${language}">${highlighted}</code></pre></div></div>`
  },

  codespan({ text }) {
    return `<code class="md-code">${text}</code>`
  },

  heading({ tokens, depth }) {
    const text = this.parser.parseInline(tokens)
    return `<h${depth} class="md-h${depth}">${text}</h${depth}>`
  },

  hr() {
    return '<hr class="md-hr" />'
  },

  image({ href, title, text }) {
    return `<img class="md-img" src="${href}"${title ? ` title="${title}"` : ''} alt="${text}" />`
  },

  link({ href, title, text }) {
    return `<a class="md-link" href="${href}"${title ? ` title="${title}"` : ''}>${text}</a>`
  },

  list(token) {
    const tag = token.ordered ? 'ol' : 'ul'
    const start = token.ordered && token.start !== 1
      ? ` start="${token.start}"`
      : ''
    const items = token.items
      .map(item => this.listitem(item))
      .join('')
    return `<${tag} class="md-list"${start}>${items}</${tag}>`
  },

  listitem(token) {
    const inner = this.parser.parse(token.tokens)
    return `<li class="md-li">${inner}</li>`
  },

  paragraph({ tokens }) {
    const inner = this.parser.parseInline(tokens)
    return `<p class="md-p">${inner}</p>`
  },

  table(token) {
    const header = `<tr>${token.header
      .map(cell => this.tablecell(cell))
      .join('')}</tr>`

    const body = token.rows
      .map(row =>
        `<tr>${row
          .map(cell => this.tablecell(cell))
          .join('')}</tr>`
      )
      .join('')

    return `
      <table class="md-table">
        <thead>${header}</thead>
        <tbody>${body}</tbody>
      </table>
    `
  },

  tablerow(token) {
    return `<tr class="md-tr">${token.map(cell => this.tablecell(cell)).join('')}</tr>`
  },

  tablecell(token) {
    const tag = token.header ? 'th' : 'td'
    return `<${tag} class="md-${tag}">${this.parser.parseInline(token.tokens)}</${tag}>`
  },
}

marked.use({ renderer })
marked.setOptions({ breaks: true, gfm: true })

export default defineComponent({
  name: 'MarkdownRenderer',
  components: {
    NodeRenderer
  },
  inject: {
    CUSTOM_TAGS: {
      default: () => [],
    },
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
      pendingUpdate: false,
      astTree: [],
    }
  },
  watch: {
    content: {
      handler() {
        if (!this.pendingUpdate) {
          this.pendingUpdate = true
          this.updateAstTree()
        }
      },
      immediate: true,
    },
  },
  beforeDestroy() {
    if (this.htmlRafId) {
      cancelAnimationFrame(this.htmlRafId)
    }
  },
  methods: {
    getHtml() {
      const { content } = this
      /** 
       * Avoid flickering by building self-healing markdown content used remend
       * example: "This is **bold text"
       * output: "This is **bold text**"
       */
      return content ? DOMPurify.sanitize(marked(remend(content)), {
        ADD_TAGS: this.CUSTOM_TAGS,
        ALLOW_DATA_ATTR: true,
      }) : ''
    },
    updateAstTree() {
      if (this.htmlRafId) {
        cancelAnimationFrame(this.htmlRafId)
      }
      this.htmlRafId = requestAnimationFrame(() => {
        this.pendingUpdate = false
        this.htmlRafId = null

        // Convert HTML to vNodes so that every content change triggers Vue's diff algorithm for incremental updates only.
        const html = this.getHtml()
        this.astTree = html ? parseDocument(html).children : []
      })
    },
  },
})
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
     tw-text-align: left;
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
     tw-text-align: right;

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
     tw-text-align: left;
    }

    .md-th {
      background-color: @surface-muted;
      font-weight: 600;
    }
  }

  .md-link {
    color: @primary-color;
   tw-text-decoration: none;

    &:hover {
     tw-text-decoration: underline;
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
}
</style>
