<template>
  <div class="tw-flex tw-flex-col tw-gap-2 tw-rounded-sm tw-border tw-bg-background tw-p-2 tw-text-xs">
    <div>
      <div class="tw-text-muted-foreground">Input</div>
      <pre class="tw-overflow-x-auto tw-rounded tw-border tw-bg-secondary tw-p-2 tw-whitespace-pre-wrap tw-break-all">{{ formattedInput }}</pre>
    </div>
    <div v-if="resultText">
      <div class="tw-text-muted-foreground">Output</div>
      <pre class="tw-max-h-200px tw-overflow-auto tw-rounded tw-border tw-bg-secondary tw-p-2 tw-whitespace-pre-wrap tw-break-all">{{ resultText }}</pre>
    </div>
  </div>
</template>

<script>
import { defineComponent, computed } from '@/composables/vue';
import { parseInput, getResultText } from '../tool-utils';

export default defineComponent({
  name: 'BashRenderer',
  props: {
    pair: { type: Object, required: true },
  },
  setup(props) {
    const formattedInput = computed(() => {
      try {
        return JSON.stringify(parseInput(props.pair.call.input), null, 2);
      } catch {
        return props.pair.call.input || '{}';
      }
    });
    const resultText = computed(() => (props.pair.result ? getResultText(props.pair.result) : ''));
    return { formattedInput, resultText };
  },
});
</script>
