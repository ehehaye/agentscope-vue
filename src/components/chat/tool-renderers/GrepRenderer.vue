<template>
  <pre
    v-if="resultText"
    class="tw-overflow-x-auto tw-rounded-sm tw-border tw-bg-background tw-p-2 tw-font-mono tw-text-xs tw-whitespace-pre"
    >{{ resultText }}</pre>
</template>

<script>
import { defineComponent, computed } from '@/composables/vue';
import { getResultText } from '../tool-utils';

// 对齐 TSX 版 renderBody：等宽字体 + 保留空白 + 横向滚动，长行不被换行破坏；
// 没有 result 时返回 null，由外层 ToolCallRow 决定是否展开。
export default defineComponent({
  name: 'GrepRenderer',
  props: {
    pair: { type: Object, required: true },
  },
  setup(props) {
    const resultText = computed(() => (props.pair.result ? getResultText(props.pair.result) : ''));
    return { resultText };
  },
});
</script>
