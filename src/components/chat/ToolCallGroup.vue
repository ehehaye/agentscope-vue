<template>
  <div class="tw-rounded-md tw-border tw-border-border tw-bg-muted tw-p-2 tw-text-sm">
    <Collapsible :default-open="false">
      <template #trigger="{ open }">
        <div class="tw-flex tw-items-center tw-gap-2 tw-text-muted-foreground" :class="{ shimmer: !allFinished }">
          <span>{{ title }}</span>
          <DiffStats :insertions="insertions" :deletions="deletions" />
          <Icon
            icon="lucide:chevron-right"
            class="tw-h-3 tw-w-3 tw-transition-transform"
            :class="{ 'tw-rotate-90': open }"
          />
        </div>
      </template>
      <div class="tw-mt-2 tw-flex tw-flex-col tw-gap-2">
        <ToolCallRow v-for="pair in calls" :key="pair.call.id" :pair="pair" />
      </div>
    </Collapsible>
  </div>
</template>

<script>
import { defineComponent, computed } from '@/composables/vue';
import { Icon } from '@iconify/vue2';
import Collapsible from '@/components/ui/Collapsible.vue';
import ToolCallRow from './ToolCallRow.vue';
import DiffStats from './DiffStats.vue';
import { summarizeToolGroup, countDiffStats, getResultDiff } from './tool-utils';

export default defineComponent({
  name: 'ToolCallGroup',
  components: { Collapsible, Icon, ToolCallRow, DiffStats },
  props: {
    calls: { type: Array, required: true },
  },
  setup(props) {
    const title = computed(() => summarizeToolGroup(props.calls));
    // React 版变量名 allFinished，语义实为「仍在进行中」（任一 call 无 result 或 running）。
    const allFinished = computed(() =>
      props.calls.some((c) => !c.result || c.result.state === 'running'),
    );

    const insertions = computed(() => diffStats.value.insertions);
    const deletions = computed(() => diffStats.value.deletions);
    const diffStats = computed(() => {
      let ins = 0;
      let del = 0;
      for (const { call, result } of props.calls) {
        if (call.name === 'Edit' || call.name === 'Write') {
          const diff = result ? getResultDiff(result) : undefined;
          if (diff) {
            const stats = countDiffStats(diff);
            ins += stats.insertions;
            del += stats.deletions;
          }
        }
      }
      return { insertions: ins, deletions: del };
    });

    return {
      title,
      allFinished,
      insertions,
      deletions,
    };
  },
});
</script>
