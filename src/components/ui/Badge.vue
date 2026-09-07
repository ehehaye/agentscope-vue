<template>
  <span
    class="inline-flex items-center gap-0.5 whitespace-nowrap rounded-md border border-transparent px-2 py-0.5 text-xs font-medium"
    :class="variantClass"
  >
    <slot />
  </span>
</template>

<script>
import { defineComponent, computed } from '@vue/composition-api';

// 自实现 Badge（对齐 shadcn badge secondary 变体；03 §5.2 中 el-badge 语义不符——
// Element 的 el-badge 是角标计数，chip 场景用本组件）。
export default defineComponent({
  name: 'Badge',
  props: {
    variant: { type: String, default: 'secondary' },
  },
  setup(props) {
    const variantClass = computed(() => {
      switch (props.variant) {
        case 'outline':
          return 'border-border text-foreground';
        case 'destructive':
          return 'bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-50';
        case 'secondary':
        default:
          return 'bg-secondary text-secondary-foreground';
      }
    });
    return { variantClass };
  },
});
</script>
