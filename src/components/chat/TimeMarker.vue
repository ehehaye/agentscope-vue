<template>
  <div class="tw-my-4 tw-flex tw-items-center tw-justify-center">
    <span class="tw-rounded-full tw-bg-muted tw-px-3 tw-py-1 tw-font-mono tw-text-xs tw-text-muted-foreground">
      {{ stamp }}
    </span>
  </div>
</template>

<script>
import { defineComponent, computed } from '@/composables/vue';

export default defineComponent({
  name: 'TimeMarker',
  props: {
    at: { type: Date, required: true },
    previous: { type: Date, required: true },
  },
  setup(props) {
    const stamp = computed(() => {
      const sameDay = props.at.toDateString() === props.previous.toDateString();
      const opts = {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        ...(sameDay ? {} : { month: 'short', day: 'numeric' }),
      };
      return new Intl.DateTimeFormat('zh-CN', opts).format(props.at);
    });
    return { stamp };
  },
});
</script>
