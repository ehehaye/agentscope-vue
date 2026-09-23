<template>
  <div class="tw-mb-2 tw-w-full tw-space-y-3 tw-rounded-28px tw-bg-card tw-p-3 tw-ring-1 tw-ring-border">
    <div class="tw-flex tw-items-center tw-gap-2 tw-px-2 tw-text-sm tw-font-medium tw-text-secondary-foreground">
      <Icon icon="lucide:users" class="tw-h-4 tw-w-4 tw-shrink-0" />
      <span>{{ `${entry.worker_agent_name} 请求确认` }}</span>
    </div>
    <div class="tw-space-y-2">
      <ConfirmCard
        v-for="toolCall in toolCalls"
        :key="toolCall.id"
        :tool-call="toolCall"
        @confirm="(confirm, rules) => onConfirm(toolCall, confirm, rules)"
      />
    </div>
  </div>
</template>

<script>
import { defineComponent, computed } from '@/composables/vue';
import { Icon } from '@/plugins/iconify';
import ConfirmCard from './ConfirmCard.vue';

export default defineComponent({
  name: 'SubagentHitlCard',
  components: { Icon, ConfirmCard },
  props: {
    entry: { type: Object, required: true },
  },
  emits: ['confirm'],
  setup(props, { emit }) {
    const toolCalls = computed(() => props.entry.event?.tool_calls ?? []);

    function onConfirm(toolCall, confirm, rules) {
      emit('confirm', toolCall, confirm, rules);
    }

    return {
      toolCalls,
      onConfirm,
    };
  },
});
</script>
