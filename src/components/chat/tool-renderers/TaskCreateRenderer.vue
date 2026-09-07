<template>
  <pre class="max-h-[200px] overflow-auto rounded-sm border bg-background p-2 text-xs whitespace-pre-wrap break-all">{{ resultText || 'Creating task...' }}</pre>
</template>

<script>
import { defineComponent, computed } from '@vue/composition-api';
import { getResultText } from '../tool-utils';

export default defineComponent({
  name: 'TaskCreateRenderer',
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
