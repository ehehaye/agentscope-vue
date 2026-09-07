<template>
  <div class="flex flex-col rounded-sm border bg-background">
    <div v-if="filePath" class="px-2 py-1 text-xs text-muted-foreground">{{ filePath }}</div>
    <DiffPreview v-if="diffText" :unified-diff="diffText" />
    <pre v-else class="max-h-[200px] overflow-auto p-2 text-xs whitespace-pre-wrap break-all">{{ resultText }}</pre>
  </div>
</template>

<script>
import { defineComponent, computed } from '@vue/composition-api';
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
