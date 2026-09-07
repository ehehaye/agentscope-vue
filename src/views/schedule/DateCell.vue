<template>
  <div ref="cellRef" class="cursor-pointer overflow-hidden border-r border-b border-border p-2 hover:bg-accent">
    <div class="mb-1 flex items-start justify-between">
      <div class="flex h-6 w-6 items-center justify-center">
        <div
          :class="[
            'text-sm',
            isToday ? 'flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground' : '',
          ]"
        >
          {{ day }}
        </div>
      </div>
    </div>
    <div class="space-y-1">
      <div
        v-for="event in visibleEvents"
        :key="event.id"
        class="flex cursor-pointer flex-row justify-between rounded-sm px-1 py-0.5 text-xs text-secondary-foreground hover:bg-primary/20"
        :title="`${event.time} - ${event.title}`"
        @click.stop="$emit('event-click', event)"
      >
        <div class="flex flex-1 flex-row items-center gap-x-1 overflow-hidden">
          <div class="h-full w-1 min-w-1 max-w-1 rounded bg-primary" />
          <span class="truncate">{{ event.title }}</span>
        </div>
        <span>{{ event.time }}</span>
      </div>
      <el-dropdown v-if="events.length > maxVisibleEvents" trigger="click" @command="$emit('event-click', $event)">
        <div class="cursor-pointer px-1 text-xs text-muted-foreground hover:text-foreground hover:underline">
          +{{ events.length - maxVisibleEvents }} {{ moreText }}
        </div>
        <el-dropdown-menu slot="dropdown" class="max-w-64">
          <el-dropdown-item
            v-for="event in hiddenEvents"
            :key="event.id"
            :command="event"
            class="text-xs"
          >
            <span class="font-medium">{{ event.time }}</span>
            <span class="ml-2 truncate">{{ event.title }}</span>
          </el-dropdown-item>
        </el-dropdown-menu>
      </el-dropdown>
    </div>
  </div>
</template>

<script>
import { defineComponent, ref, computed, onMounted, onBeforeUnmount } from '@vue/composition-api';

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
