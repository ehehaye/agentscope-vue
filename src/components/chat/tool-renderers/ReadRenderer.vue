<template>
  <div class="tw-flex tw-flex-col tw-rounded-sm tw-border tw-bg-background">
    <div v-if="filePath" class="tw-px-2 tw-py-1 tw-text-xs tw-text-muted-foreground">{{ filePath }}</div>
    <DiffPreview v-if="diffText" :unified-diff="diffText" />
    <pre v-else class="tw-max-h-200px tw-overflow-auto tw-p-2 tw-text-xs tw-whitespace-pre-wrap tw-break-all">{{ resultText }}</pre>
  </div>
</template>

<script>
import { defineComponent, computed } from '@/composables/vue';
import { getResultText, tryGetFilePath } from '../tool-utils';
import DiffPreview from './DiffPreview.vue';

function buildContextDiff(content) {
  const lines = content.split('\n');
  const body = lines.map((line) => ` ${line}`).join('\n');
  return `--- a/file\n+++ b/file\n@@ -1,${lines.length} +1,${lines.length} @@\n${body}`;
}

export default defineComponent({
  name: 'ReadRenderer',
  components: { DiffPreview },
  props: {
    pair: { type: Object, required: true },
  },
  setup(props) {
    const filePath = computed(() => tryGetFilePath(props.pair.call.input));
    const resultText = computed(() =>
      props.pair.result ? getResultText(props.pair.result) : '',
    );
    const diffText = computed(() => {
      if (!props.pair.result || props.pair.result.state !== 'success') return '';
      const text = resultText.value;
      if (!text) return '';
      return buildContextDiff(text);
    });
    return { filePath, resultText, diffText };
  },
});
</script>
