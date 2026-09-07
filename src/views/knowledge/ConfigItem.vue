<template>
  <div class="flex min-w-0 flex-col gap-y-0.5">
    <span class="text-xs text-muted-foreground">{{ label }}</span>
    <span class="truncate text-sm text-foreground" :title="value">{{ value }}</span>
  </div>
</template>

<script>
import { defineComponent } from '@/composables/vue';

export default defineComponent({
  name: 'KnowledgeConfigItem',
  props: {
    label: { type: String, required: true },
    value: { type: String, default: '' },
  },
});
</script>
