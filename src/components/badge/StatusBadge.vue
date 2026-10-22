<template>
  <span
    v-if="status === 'running'"
    class="tw-inline-flex tw-items-center tw-gap-1 tw-rounded-md tw-border tw-border-transparent tw-bg-secondary tw-px-2 tw-py-0.5 tw-text-xs tw-font-medium tw-text-secondary-foreground"
  >
    <Spinner
      data-icon="inline-start"
      class="tw-h-3.5 tw-w-3.5"
    />
    <span>运行中</span>
  </span>
  <span
    v-else-if="status === 'completed'"
    class="tw-inline-flex tw-items-center tw-gap-1 tw-rounded-md tw-border tw-border-transparent tw-bg-green-50 tw-px-2 tw-py-0.5 tw-text-xs tw-font-medium tw-text-green-700 dark:tw-bg-green-950 dark:tw-text-green-300"
  >
    <Icon
      icon="lucide:check-circle"
      class="tw-h-3.5 tw-w-3.5"
    />
    <span>已完成</span>
  </span>
  <span
    v-else-if="status === 'failed'"
    class="tw-inline-flex tw-items-center tw-gap-1 tw-rounded-md tw-border tw-border-transparent tw-bg-red-50 tw-px-2 tw-py-0.5 tw-text-xs tw-font-medium tw-text-red-700 dark:tw-bg-red-950 dark:tw-text-red-300"
  >
    <Icon
      icon="lucide:x-circle"
      class="tw-h-3.5 tw-w-3.5"
    />
    <span>已失败</span>
  </span>
  <span
    v-else-if="status === 'awaiting'"
    class="tw-inline-flex tw-items-center tw-gap-1 tw-rounded-md tw-border tw-border-transparent tw-bg-yellow-50 tw-px-2 tw-py-0.5 tw-text-xs tw-font-medium tw-text-yellow-700 dark:tw-bg-yellow-900 dark:tw-text-yellow-100"
  >
    <Icon
      icon="lucide:clock"
      class="tw-h-3.5 tw-w-3.5"
    />
    <span>待处理</span>
  </span>
  <span
    v-else-if="status === 'pending'"
    class="tw-inline-flex tw-items-center tw-gap-1 tw-rounded-md tw-border tw-border-transparent tw-bg-muted tw-px-2 tw-py-0.5 tw-text-xs tw-font-medium tw-text-muted-foreground"
  >
    <Icon
      icon="lucide:circle-dashed"
      class="tw-h-3.5 tw-w-3.5"
    />
    <span>等待开始</span>
  </span>
</template>

<script>
import { defineComponent } from '@/composables/vue';
import Icon from '@/components/ui/Icon';
import Spinner from '@/components/ui/Spinner.vue';

export default defineComponent({
  name: 'StatusBadge',
  components: { Icon, Spinner },
  props: {
    status: { type: String, default: 'running' },
  },
  setup() {
    return {};
  },
});
</script>
