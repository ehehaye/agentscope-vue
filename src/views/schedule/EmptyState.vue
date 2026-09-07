<template>
  <div class="tw-flex tw-size-full tw-flex-col tw-items-center tw-justify-center tw-gap-4 tw-rounded-xl tw-border tw-border-dashed tw-p-6 tw-text-center">
    <Icon icon="lucide:calendar" class="tw-h-8 tw-w-8 tw-text-muted-foreground" />
    <div class="tw-flex tw-max-w-sm tw-flex-col tw-items-center tw-gap-2">
      <div class="tw-text-sm tw-font-medium">{{ title || TEXT.schedule.noSchedules }}</div>
      <p class="tw-text-sm tw-text-muted-foreground">{{ description || TEXT.schedule.noSchedulesDescription }}</p>
    </div>
    <div v-if="$slots.default" class="tw-flex tw-w-full tw-max-w-sm tw-flex-col tw-items-center tw-gap-2">
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
