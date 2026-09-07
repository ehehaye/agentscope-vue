<template>
  <span v-if="status === 'running'" class="tw-inline-flex tw-items-center tw-gap-1 tw-rounded-md tw-border tw-border-transparent tw-bg-secondary tw-px-2 tw-py-0.5 tw-text-xs tw-font-medium tw-text-secondary-foreground">
    <Spinner data-icon="inline-start" class="tw-h-3.5 tw-w-3.5" />
    <span>{{ COMMON.running }}</span>
  </span>
  <span v-else-if="status === 'completed'" class="tw-inline-flex tw-items-center tw-gap-1 tw-rounded-md tw-border tw-border-transparent tw-bg-green-50 tw-px-2 tw-py-0.5 tw-text-xs tw-font-medium tw-text-green-700 dark:tw-bg-green-950 dark:tw-text-green-300">
    <Icon icon="lucide:check-circle" class="tw-h-3.5 tw-w-3.5" />
    <span>{{ COMMON.completed }}</span>
  </span>
  <span v-else-if="status === 'failed'" class="tw-inline-flex tw-items-center tw-gap-1 tw-rounded-md tw-border tw-border-transparent tw-bg-red-50 tw-px-2 tw-py-0.5 tw-text-xs tw-font-medium tw-text-red-700 dark:tw-bg-red-950 dark:tw-text-red-300">
    <Icon icon="lucide:x-circle" class="tw-h-3.5 tw-w-3.5" />
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
