<template>
  <div
    v-if="successBody"
    class="tw-flex tw-flex-col tw-rounded-sm tw-border tw-bg-background"
  >
    <div
      v-if="filePath"
      class="tw-px-2 tw-py-1 tw-text-xs tw-text-muted-foreground"
    >
      {{ filePath }}
    </div>
    <DiffPreview :unified-diff="diff" />
  </div>
  <DefaultRenderer
    v-else
    :pair="pair"
  />
</template>

<script>
import { defineComponent, computed } from '@/composables/vue';
import { getResultText, tryGetFilePath } from '../tool-utils';
import DiffPreview from './DiffPreview.vue';
import DefaultRenderer from './DefaultRenderer.vue';

// 把 cat -n 格式化（"    12\tcontent"）的 Read 结果拆成 { num, text } 行。
// 没有 tab 的行（如非文本/二进制输出）回退到空行号。
function parseNumberedLines(content) {
  return content.split('\n').map((line) => {
    const tab = line.indexOf('\t');
    if (tab === -1) return { num: '', text: line };
    return { num: line.slice(0, tab).trim(), text: line.slice(tab + 1) };
  });
}

// 把 Read 结果包装成 unified diff，让它和 Edit / Write 共用同一个 DiffPreview。
// 起始行号取自第一条 cat -n 行号，保证 offset 部分读取也展示绝对行号。
function buildContextDiff(content) {
  const rows = parseNumberedLines(content);
  const start = parseInt(rows[0]?.num ?? '', 10) || 1;
  const body = rows.map((row) => ` ${row.text}`).join('\n');
  return `--- a/file\n+++ b/file\n@@ -${start},${rows.length} +${start},${rows.length} @@\n${body}`;
}

export default defineComponent({
  name: 'ReadRenderer',
  components: { DiffPreview, DefaultRenderer },
  props: {
    pair: { type: Object, required: true },
  },
  setup(props) {
    const filePath = computed(() => tryGetFilePath(props.pair.call.input));
    const diff = computed(() => {
      if (!props.pair.result || props.pair.result.state !== 'success') return '';
      const text = getResultText(props.pair.result);
      return text ? buildContextDiff(text) : '';
    });
    // success 才走文件预览；其它交给 DefaultRenderer（running 徽标 / interrupted
    // 边框 / 多模态拍平等）。
    const successBody = computed(() => !!diff.value);
    return { filePath, diff, successBody };
  },
});
</script>
