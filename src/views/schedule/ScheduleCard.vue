<template>
  <div
    data-slot="item"
    data-variant="outline"
    class="tw-group/item tw-flex tw-w-full tw-flex-wrap tw-items-center tw-gap-2.5 tw-rounded-lg tw-border tw-border-border tw-px-3 tw-py-2.5 tw-text-sm tw-transition-colors tw-duration-100 hover:tw-bg-muted tw-cursor-pointer"
    @click="$emit('click')"
  >
    <div data-slot="item-media" data-variant="icon" class="tw-flex tw-shrink-0 tw-items-center tw-justify-center tw-gap-2 [&_svg]:tw-pointer-events-none [&_svg]:tw-h-4 [&_svg]:tw-w-4">
      <Icon v-if="schedule.data.enabled" icon="lucide:bot" />
      <Icon v-else icon="lucide:bot-off" />
    </div>
    <div data-slot="item-content" class="tw-flex tw-flex-1 tw-flex-col tw-gap-1">
      <div data-slot="item-title" class="tw-line-clamp-1 tw-flex tw-w-fit tw-items-center tw-gap-2 tw-text-sm tw-font-medium" style="font-weight: 550;">
        {{ schedule.data.name }}
      </div>
      <div data-slot="item-description" class="tw-line-clamp-2 tw-flex tw-items-center tw-gap-2 tw-text-left tw-text-xs tw-text-muted-foreground">
        <span v-if="!schedule.data.enabled" class="tw-inline-flex tw-items-center tw-gap-1 tw-rounded-md tw-border tw-border-transparent tw-bg-secondary tw-px-2 tw-py-0.5 tw-text-xs tw-font-medium tw-text-secondary-foreground">
          <Icon icon="lucide:pause" class="tw-h-3 tw-w-3" />
          <span>{{ COMMON.disabled }}</span>
        </span>
        <span class="tw-inline-flex tw-items-center tw-gap-1 tw-pl-0 tw-text-xs tw-font-medium tw-text-primary">
          <Icon icon="lucide:calendar" class="tw-h-3 tw-w-3" data-icon="inline-start" />
          <span>{{ new Date(schedule.data.started_at).toLocaleDateString() }}</span>
          <span v-if="schedule.data.ended_at" class="tw-inline-flex tw-items-center tw-gap-1">
            <Icon icon="lucide:arrow-right" class="tw-h-3 tw-w-3 tw-text-muted-foreground" />
            <span>{{ new Date(schedule.data.ended_at).toLocaleDateString() }}</span>
          </span>
          <span>{{ parsed.time }}</span>
        </span>
        <span class="tw-inline-flex tw-items-center tw-gap-1 tw-text-xs tw-font-medium tw-text-primary">
          <Icon icon="lucide:clipboard-clock" class="tw-h-3 tw-w-3" data-icon="inline-start" />
          <span>{{ frequencyLabel }}</span>
        </span>
      </div>
    </div>
  </div>
</template>

<script>
import { defineComponent, computed } from '@/composables/vue';
import { Icon } from '@iconify/vue2';
import { parseCronExpression, getFrequencyLabel } from './schedule-utils';
import { TEXT } from './text';
import { COMMON } from '@/constants/text';

export default defineComponent({
  name: 'ScheduleCard',
  components: { Icon },
  props: {
    schedule: { type: Object, required: true },
  },
  setup(props) {
    const parsed = computed(() => parseCronExpression(props.schedule.data.cron_expression, props.schedule.data.started_at));
    const frequencyLabel = computed(() => getFrequencyLabel(parsed.value, TEXT.schedule));
    return { parsed, frequencyLabel, COMMON };
  },
});
</script>
