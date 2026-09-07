<template>
  <div class="my-4 flex items-center justify-center">
    <span class="rounded-full bg-muted px-3 py-1 font-mono text-xs text-muted-foreground">
      {{ stamp }}
    </span>
  </div>
</template>

<script>
import { defineComponent, computed } from '@vue/composition-api';

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
