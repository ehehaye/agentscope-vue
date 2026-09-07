<template>
  <div class="mb-2 w-full space-y-3 rounded-[28px] bg-card p-3 ring-1 ring-border">
    <div class="flex items-center gap-2 px-2 text-sm font-medium text-secondary-foreground">
      <Icon icon="lucide:users" class="h-4 w-4 shrink-0" />
      <span>{{ TEXT.subagentConfirmTitle(entry.worker_agent_name) }}</span>
    </div>
    <div class="space-y-2">
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
import { defineComponent, computed } from '@vue/composition-api';
import { Icon } from '@iconify/vue2';
import ConfirmCard from './ConfirmCard.vue';
import { TEXT } from './text';

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
      TEXT,
    };
  },
});
</script>
