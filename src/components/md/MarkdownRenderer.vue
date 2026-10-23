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
import { parseDocument } from 'htmlparser2';
import NodeRenderer from './NodeRenderer.vue';
import { marked } from './marked';
import diff from './diff';

// 流式输出时最快每 120ms 重新解析一次，避免每来一小段就整篇重排
const RENDER_INTERVAL_MS = 120;

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
      renderTimer: null,
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
    if (this.renderTimer) {
      clearTimeout(this.renderTimer);
      this.renderTimer = null;
    }
  },
  methods: {
    updateAstTree() {
      // 首次渲染立即执行；此后把间隔内的多次变化合并成一次解析。
      const wait = this.lastRenderAt ? RENDER_INTERVAL_MS - (performance.now() - this.lastRenderAt) : 0;
      if (wait <= 0) {
        if (this.renderTimer) {
          clearTimeout(this.renderTimer);
          this.renderTimer = null;
        }
        this.renderAstTree();
        return;
      }
      if (this.renderTimer) clearTimeout(this.renderTimer);
      this.renderTimer = setTimeout(() => {
        this.renderTimer = null;
        this.renderAstTree();
      }, wait);
    },
    renderAstTree() {
      this.lastRenderAt = performance.now();
      const html = this.getHtml();
      if (this.lastHtml === html) {
        return;
      }
      this.lastHtml = html;
      // 把 HTML 转成 vNode 树，让每次内容变化只触发 Vue diff 做增量更新。
      // 冻结后 Vue 2 的 observe 会因对象不可扩展而跳过深度响应式转换，省掉每帧 O(树大小)
      // 的递归遍历与闭包开销；代价是这棵树只能整体替换，不能再原地修改（严格模式下会抛错）。
      this.astTree = Object.freeze(html ? parseDocument(html).children : []);
    },
  },
});
</script>

<style lang="less">
.markdown-renderer {
  line-height: 1.8;
  color: @text-color;

  // 还原列表样式
  ul > li {
    list-style-type: disc;
  }

  ol > li {
    list-style-type: decimal;
  }

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
    line-break: anywhere;
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
    color: #409eff;
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
