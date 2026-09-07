<template>
  <div
    class="tw-rounded-2xl tw-px-4 tw-py-2.5 tw-text-sm"
    :class="[
      variant === 'muted'
        ? 'tw-bg-muted tw-text-foreground'
        : 'tw-bg-card tw-text-foreground tw-shadow-sm',
    ]"
  >
    <slot />
  </div>
</template>

<script>
import { defineComponent } from '@/composables/vue';

export default defineComponent({
  name: 'Bubble',
  props: {
    variant: { type: String, default: 'ghost' },
  },
});
</script>
