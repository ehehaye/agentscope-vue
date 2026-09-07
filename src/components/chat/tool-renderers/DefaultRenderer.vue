<template>
  <div>
    <pre class="max-h-[200px] overflow-auto rounded-sm border bg-background p-2 text-xs whitespace-pre-wrap break-all">{{ inputText }}</pre>
  </div>
</template>

<script>
import { defineComponent, computed } from '@vue/composition-api';

// 兜底渲染器：ToolCallRow 统一以 :pair="{ call, result }" 传入。
export default defineComponent({
  name: 'DefaultRenderer',
  props: {
    pair: { type: Object, required: true },
  },
  setup(props) {
    const inputText = computed(() => {
      const input = props.pair?.call?.input;
      if (!input) return '{}';
      try {
        return JSON.stringify(JSON.parse(input), null, 2);
      } catch {
        return input;
      }
    });
    return { inputText };
  },
});
</script>
