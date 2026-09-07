<template>
  <div class="tw-flex tw-min-w-0 tw-flex-col tw-gap-y-0.5">
    <span class="tw-text-xs tw-text-muted-foreground">{{ label }}</span>
    <span class="tw-truncate tw-text-sm tw-text-foreground" :title="value">{{ value }}</span>
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
