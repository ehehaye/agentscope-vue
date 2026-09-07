<template>
  <div class="flex flex-col rounded-sm border bg-background">
    <div v-if="filePath" class="px-2 py-1 text-xs text-muted-foreground">{{ filePath }}</div>
    <DiffPreview v-if="diff" :unified-diff="diff" />
    <pre v-else-if="resultText" class="tw-max-h-200px overflow-auto p-2 text-xs whitespace-pre-wrap break-all">{{ resultText }}</pre>
  </div>
</template>

<script>
import { defineComponent, computed } from '@/composables/vue';
import { getResultText, tryGetFilePath, getResultDiff } from '../tool-utils';
import DiffPreview from './DiffPreview.vue';

export default defineComponent({
  name: 'EditRenderer',
  components: { DiffPreview },
  props: {
    pair: { type: Object, required: true },
  },
  setup(props) {
    const filePath = computed(() => tryGetFilePath(props.pair.call.input));
    const resultText = computed(() =>
      props.pair.result ? getResultText(props.pair.result) : '',
    );
    const diff = computed(() =>
      props.pair.result ? getResultDiff(props.pair.result) || '' : '',
    );
    return { filePath, resultText, diff };
  },
});
</script>
