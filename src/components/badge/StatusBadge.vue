<template>
  <span v-if="status === 'running'" class="inline-flex items-center gap-1 rounded-md border border-transparent bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
    <Spinner data-icon="inline-start" class="h-3.5 w-3.5" />
    <span>{{ COMMON.running }}</span>
  </span>
  <span v-else-if="status === 'completed'" class="inline-flex items-center gap-1 rounded-md border border-transparent bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-950 dark:text-green-300">
    <Icon icon="lucide:check-circle" class="h-3.5 w-3.5" />
    <span>{{ COMMON.completed }}</span>
  </span>
  <span v-else-if="status === 'failed'" class="inline-flex items-center gap-1 rounded-md border border-transparent bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-950 dark:text-red-300">
    <Icon icon="lucide:x-circle" class="h-3.5 w-3.5" />
    <span>{{ COMMON.failed }}</span>
  </span>
</template>

<script>
import { defineComponent } from '@/composables/vue';
import { Icon } from '@iconify/vue2';
import Spinner from '@/components/ui/Spinner.vue';
import { COMMON } from '@/constants/text';

export default defineComponent({
  name: 'StatusBadge',
  components: { Icon, Spinner },
  props: {
    status: { type: String, default: 'running' },
  },
  setup() {
    return { COMMON };
  },
});
</script>
