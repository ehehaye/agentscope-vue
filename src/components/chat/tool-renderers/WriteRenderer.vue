<template>
  <div class="tw-flex tw-flex-col tw-rounded-sm tw-border tw-bg-background">
    <div v-if="filePath" class="tw-px-2 tw-py-1 tw-text-xs tw-text-muted-foreground">{{ filePath }}</div>
    <DiffPreview v-if="diff" :unified-diff="diff" />
    <pre v-else-if="resultText" class="tw-max-h-200px tw-overflow-auto tw-p-2 tw-text-xs tw-whitespace-pre-wrap tw-break-all">{{ resultText }}</pre>
  </div>
</template>

<script>
import { defineComponent, computed } from '@/composables/vue';
import { getResultText, tryGetFilePath, getResultDiff } from '../tool-utils';
import DiffPreview from './DiffPreview.vue';

export default defineComponent({
  name: 'WriteRenderer',
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
