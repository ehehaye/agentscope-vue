<template>
  <Icon
    v-if="state === 'success'"
    icon="lucide:check"
    class="tw-h-3 tw-w-3 tw-shrink-0 tw-text-emerald-600 dark:tw-text-emerald-400"
  />
  <Icon
    v-else-if="state === 'error'"
    icon="lucide:x"
    class="tw-h-3 tw-w-3 tw-shrink-0 tw-text-red-600 dark:tw-text-red-400"
  />
  <Icon
    v-else-if="state === 'interrupted' || state === 'denied'"
    icon="lucide:ban"
    class="tw-h-3 tw-w-3 tw-shrink-0"
  />
  <Icon v-else icon="lucide:loader-circle" class="tw-h-3 tw-w-3 tw-shrink-0 tw-animate-spin" />
</template>

<script>
import { defineComponent } from '@/composables/vue';
import { Icon } from '@iconify/vue2';

export default defineComponent({
  name: 'ToolStateIcon',
  components: { Icon },
  props: {
    state: { type: String, default: 'running' },
  },
});
</script>
