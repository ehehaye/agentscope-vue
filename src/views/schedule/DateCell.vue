<template>
  <div ref="cellRef" class="tw-cursor-pointer tw-overflow-hidden tw-border-r tw-border-b tw-border-border tw-p-2 hover:tw-bg-accent">
    <div class="tw-mb-1 tw-flex tw-items-start tw-justify-between">
      <div class="tw-flex tw-h-6 tw-w-6 tw-items-center tw-justify-center">
        <div
          :class="[
            'tw-text-sm',
            isToday ? 'tw-flex tw-h-6 tw-w-6 tw-items-center tw-justify-center tw-rounded-full tw-bg-primary tw-text-primary-foreground' : '',
          ]"
        >
          {{ day }}
        </div>
      </div>
    </div>
    <div class="tw-space-y-1">
      <div
        v-for="event in visibleEvents"
        :key="event.id"
        class="tw-flex tw-cursor-pointer tw-flex-row tw-justify-between tw-rounded-sm tw-px-1 tw-py-0.5 tw-text-xs tw-text-secondary-foreground hover:tw-bg-primary/20"
        :title="`${event.time} - ${event.title}`"
        @click.stop="$emit('event-click', event)"
      >
        <div class="tw-flex tw-flex-1 tw-flex-row tw-items-center tw-gap-x-1 tw-overflow-hidden">
          <div class="tw-h-full tw-w-1 tw-min-w-1 tw-max-w-1 tw-rounded tw-bg-primary" />
          <span class="tw-truncate">{{ event.title }}</span>
        </div>
        <span>{{ event.time }}</span>
      </div>
      <el-dropdown v-if="events.length > maxVisibleEvents" trigger="click" @command="$emit('event-click', $event)">
        <div class="tw-cursor-pointer tw-px-1 tw-text-xs tw-text-muted-foreground hover:tw-text-foreground hover:tw-underline">
          +{{ events.length - maxVisibleEvents }} {{ moreText }}
        </div>
        <el-dropdown-menu slot="dropdown" class="tw-max-w-64">
          <el-dropdown-item
            v-for="event in hiddenEvents"
            :key="event.id"
            :command="event"
            class="tw-text-xs"
          >
            <span class="tw-font-medium">{{ event.time }}</span>
            <span class="tw-ml-2 tw-truncate">{{ event.title }}</span>
          </el-dropdown-item>
        </el-dropdown-menu>
      </el-dropdown>
    </div>
  </div>
</template>

<script>
import { defineComponent, ref, computed, onMounted, onBeforeUnmount } from '@/composables/vue';

export default defineComponent({
  name: 'DateCell',
  props: {
    day: { type: Number, required: true },
    isToday: { type: Boolean, default: false },
    events: { type: Array, default: () => [] },
    moreText: { type: String, default: '更多' },
  },
  setup(props) {
    const cellRef = ref(null);
    const maxVisibleEvents = ref(3);

    let resizeObserver = null;

    function updateMaxEvents() {
      if (!cellRef.value) return;
      const cellHeight = cellRef.value.clientHeight;
      const padding = 8;
      const headerHeight = 28;
      const eventHeight = 24;
      const moreIndicatorHeight = 20;
      const available = cellHeight - padding - headerHeight - moreIndicatorHeight;
      maxVisibleEvents.value = Math.max(0, Math.floor(available / eventHeight));
    }

    onMounted(() => {
      updateMaxEvents();
      if (window.ResizeObserver && cellRef.value) {
        resizeObserver = new ResizeObserver((entries) => {
          for (const entry of entries) {
            const cellHeight = entry.contentRect.height;
            const padding = 8;
            const headerHeight = 28;
            const eventHeight = 24;
            const moreIndicatorHeight = 20;
            const available = cellHeight - padding - headerHeight - moreIndicatorHeight;
            maxVisibleEvents.value = Math.max(0, Math.floor(available / eventHeight));
          }
        });
        resizeObserver.observe(cellRef.value);
      }
    });

    onBeforeUnmount(() => {
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    });

    const visibleEvents = computed(() => props.events.slice(0, maxVisibleEvents.value));
    const hiddenEvents = computed(() => props.events.slice(maxVisibleEvents.value));

    return { cellRef, maxVisibleEvents, visibleEvents, hiddenEvents };
  },
});
</script>
