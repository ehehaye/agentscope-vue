<template>
  <div v-if="!result" />
  <div
    v-else-if="isRunning"
    class="tw-flex tw-flex-col tw-rounded-sm tw-border tw-bg-background"
  >
    <div class="tw-px-2 tw-py-1 tw-whitespace-nowrap tw-overflow-x-auto">运行中</div>
  </div>
  <div
    v-else-if="isInterrupted"
    class="tw-flex tw-flex-col tw-rounded-sm tw-border tw-bg-background"
  >
    <div class="tw-px-2 tw-py-1 tw-whitespace-nowrap tw-overflow-x-auto">{{ interruptedText }}</div>
  </div>
  <pre
    v-else
    class="tw-max-h-200px tw-overflow-auto tw-rounded-sm tw-border tw-bg-background tw-p-2 tw-text-xs tw-whitespace-pre-wrap"
    >{{ outputText }}</pre>
</template>

<script>
import { defineComponent, computed } from '@/composables/vue';
import * as mime from 'mime-types';
import { getResultText } from '../tool-utils';

// 兜底渲染器：ToolCallRow 统一以 :pair="{ call, result }" 传入。
// 对齐 TSX 版 defaultRenderBody：无 result 时返回空；running / interrupted
// 走小标签态；其余（success / error / denied）将 result.output（字符串或
// 多模态块数组）拍平成可滚动 <pre>，多模态块按 `[TYPE.ext]` 占位。
function flattenOutput(output) {
  if (typeof output === 'string') return output;
  if (Array.isArray(output)) {
    return output
      .map((b) => {
        if (b.type === 'text') return b.text;
        const mainType = b.source.media_type.split('/')[0].toUpperCase();
        const ext = (mime.extension(b.source.media_type) || 'bin').toLowerCase();
        return `[${mainType}.${ext}]`;
      })
      .join('\n');
  }
  return '';
}

export default defineComponent({
  name: 'DefaultRenderer',
  props: {
    pair: { type: Object, required: true },
  },
  setup(props) {
    const result = computed(() => props.pair.result);
    const isRunning = computed(() => props.pair.call.state === 'asking' || result.value?.state === 'running');
    const isInterrupted = computed(() => result.value?.state === 'interrupted');
    const interruptedText = computed(() => (result.value ? getResultText(result.value) : ''));
    const outputText = computed(() => (result.value ? flattenOutput(result.value.output) : ''));
    return { result, isRunning, isInterrupted, interruptedText, outputText };
  },
});
</script>
