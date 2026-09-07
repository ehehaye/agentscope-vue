<template>
  <div class="flex flex-col gap-2 rounded-sm border bg-background p-2 text-xs">
    <div>
      <div class="text-muted-foreground">Input</div>
      <pre class="overflow-x-auto rounded border bg-secondary p-2 whitespace-pre-wrap break-all">{{ formattedInput }}</pre>
    </div>
    <div v-if="resultText">
      <div class="text-muted-foreground">Output</div>
      <pre class="tw-max-h-200px overflow-auto rounded border bg-secondary p-2 whitespace-pre-wrap break-all">{{ resultText }}</pre>
    </div>
  </div>
</template>

<script>
import { defineComponent, computed } from '@vue/composition-api';
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
