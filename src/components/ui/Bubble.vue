<template>
  <div
    class="rounded-2xl px-4 py-2.5 text-sm"
    :class="[
      variant === 'muted'
        ? 'bg-muted text-foreground'
        : 'bg-card text-foreground shadow-sm',
    ]"
  >
    <slot />
  </div>
</template>

<script>
import { defineComponent } from '@vue/composition-api';

export default defineComponent({
  name: 'Bubble',
  props: {
    variant: { type: String, default: 'ghost' },
  },
});
</script>
