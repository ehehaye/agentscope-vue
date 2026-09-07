<template>
  <span
    class="tw-inline-flex tw-items-center tw-gap-0.5 tw-whitespace-nowrap tw-rounded-md tw-border tw-border-transparent tw-px-2 tw-py-0.5 tw-text-xs tw-font-medium"
    :class="variantClass"
  >
    <slot />
  </span>
</template>

<script>
import { defineComponent, computed } from '@/composables/vue';

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
          return 'tw-border-border tw-text-foreground';
        case 'destructive':
          return 'tw-bg-red-100 tw-text-red-900 dark:tw-bg-red-950 dark:tw-text-red-50';
        case 'secondary':
        default:
          return 'tw-bg-secondary tw-text-secondary-foreground';
      }
    });
    return { variantClass };
  },
});
</script>
