<template>
  <div class="flex size-full flex-col items-center justify-center gap-4 rounded-xl border border-dashed p-6 text-center">
    <Icon icon="lucide:calendar" class="h-8 w-8 text-muted-foreground" />
    <div class="flex max-w-sm flex-col items-center gap-2">
      <div class="text-sm font-medium">{{ title || TEXT.schedule.noSchedules }}</div>
      <p class="text-sm text-muted-foreground">{{ description || TEXT.schedule.noSchedulesDescription }}</p>
    </div>
    <div v-if="$slots.default" class="flex w-full max-w-sm flex-col items-center gap-2">
      <slot />
    </div>
  </div>
</template>

<script>
import { defineComponent } from '@/composables/vue';
import { Icon } from '@iconify/vue2';
import { TEXT } from './text';

export default defineComponent({
  name: 'ScheduleEmptyState',
  components: { Icon },
  props: {
    title: { type: String, default: '' },
    description: { type: String, default: '' },
  },
  setup() {
    return { TEXT };
  },
});
</script>
