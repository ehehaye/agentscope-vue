<template>
  <div
    v-if="description"
    class="tw-rounded-sm tw-border tw-bg-background tw-p-2 tw-text-xs tw-text-muted-foreground tw-break-all"
  >
    {{ description }}
  </div>
</template>

<script>
import { defineComponent, computed } from '@/composables/vue';
import { parseInput } from '../tool-utils';

// 对齐 TSX 版 renderBody：展开态展示 input.description 字段；
// 缺字段时返回 null，外层 ToolCallRow 不展开。
export default defineComponent({
  name: 'TaskCreateRenderer',
  props: {
    pair: { type: Object, required: true },
  },
  setup(props) {
    const description = computed(() => {
      const input = parseInput(props.pair.call.input);
      return typeof input.description === 'string' ? input.description : '';
    });
    return { description };
  },
});
</script>
