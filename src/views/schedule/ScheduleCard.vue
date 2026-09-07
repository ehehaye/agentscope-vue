<template>
  <div
    data-slot="item"
    data-variant="outline"
    class="group/item flex w-full flex-wrap items-center gap-2.5 rounded-lg border border-border px-3 py-2.5 text-sm transition-colors duration-100 hover:bg-muted cursor-pointer"
    @click="$emit('click')"
  >
    <div data-slot="item-media" data-variant="icon" class="flex shrink-0 items-center justify-center gap-2 [&_svg]:pointer-events-none [&_svg]:h-4 [&_svg]:w-4">
      <Icon v-if="schedule.data.enabled" icon="lucide:bot" />
      <Icon v-else icon="lucide:bot-off" />
    </div>
    <div data-slot="item-content" class="flex flex-1 flex-col gap-1">
      <div data-slot="item-title" class="line-clamp-1 flex w-fit items-center gap-2 text-sm font-medium" style="font-weight: 550;">
        {{ schedule.data.name }}
      </div>
      <div data-slot="item-description" class="line-clamp-2 flex items-center gap-2 text-left text-xs text-muted-foreground">
        <span v-if="!schedule.data.enabled" class="inline-flex items-center gap-1 rounded-md border border-transparent bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
          <Icon icon="lucide:pause" class="h-3 w-3" />
          <span>{{ COMMON.disabled }}</span>
        </span>
        <span class="inline-flex items-center gap-1 pl-0 text-xs font-medium text-primary">
          <Icon icon="lucide:calendar" class="h-3 w-3" data-icon="inline-start" />
          <span>{{ new Date(schedule.data.started_at).toLocaleDateString() }}</span>
          <span v-if="schedule.data.ended_at" class="inline-flex items-center gap-1">
            <Icon icon="lucide:arrow-right" class="h-3 w-3 text-muted-foreground" />
            <span>{{ new Date(schedule.data.ended_at).toLocaleDateString() }}</span>
          </span>
          <span>{{ parsed.time }}</span>
        </span>
        <span class="inline-flex items-center gap-1 text-xs font-medium text-primary">
          <Icon icon="lucide:clipboard-clock" class="h-3 w-3" data-icon="inline-start" />
          <span>{{ frequencyLabel }}</span>
        </span>
      </div>
    </div>
  </div>
</template>

<script>
import { defineComponent, computed } from '@vue/composition-api';
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
