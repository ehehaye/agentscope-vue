<template>
  <pre class="tw-max-h-200px tw-overflow-auto tw-rounded-sm tw-border tw-bg-background tw-p-2 tw-text-xs tw-whitespace-pre-wrap tw-break-all">{{ resultText || 'Searching...' }}</pre>
</template>

<script>
import { defineComponent, computed } from '@/composables/vue';
import { getResultText } from '../tool-utils';

export default defineComponent({
  name: 'GrepRenderer',
  props: {
    pair: { type: Object, required: true },
  },
  setup(props) {
    const resultText = computed(() =>
      props.pair.result ? getResultText(props.pair.result) : '',
    );
    return { resultText };
  },
});
</script>
