<template>
  <span v-if="insertions > 0 || deletions > 0" class="tw-inline-flex tw-items-center tw-gap-0.5">
    <span class="tw-text-emerald-600 dark:tw-text-emerald-400">+{{ fmt(insertions) }}</span>
    <span class="tw-text-red-600 dark:tw-text-red-400">-{{ fmt(deletions) }}</span>
  </span>
</template>

<script>
import { defineComponent } from '@/composables/vue';
import { formatNumber } from '@/utils/common';

export default defineComponent({
  name: 'DiffStats',
  props: {
    insertions: { type: Number, default: 0 },
    deletions: { type: Number, default: 0 },
  },
  setup() {
    return { fmt: formatNumber };
  },
});
</script>
