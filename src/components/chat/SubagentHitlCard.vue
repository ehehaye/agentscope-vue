<template>
  <div class="tw-mb-2 tw-w-full tw-space-y-3 tw-rounded-28px tw-bg-card tw-p-3 tw-ring-1 tw-ring-border">
    <div class="tw-flex tw-items-center tw-gap-2 tw-px-2 tw-text-sm tw-font-medium tw-text-secondary-foreground">
      <Icon icon="lucide:users" class="tw-h-4 tw-w-4 tw-shrink-0" />
      <!-- <span>{{ headerText }}</span> -->
    </div>
    <div class="tw-space-y-2">
      <!-- 外部执行（AskUser）：作答后回传 ExternalExecutionResultEvent -->
      <template v-if="isExternal">
        <AskUserCard
          v-for="toolCall in askUserCalls"
          :key="toolCall.id"
          :tool-call="toolCall"
          :on-submit="(answers) => onSubmitExternal(toolCall, answers)"
        />
      </template>
      <!-- 权限确认：是/否 -->
      <template v-else>
        <ConfirmCard
          v-for="toolCall in toolCalls"
          :key="toolCall.id"
          :tool-call="toolCall"
          @confirm="(confirm, rules) => onConfirm(toolCall, confirm, rules)"
        />
      </template>
    </div>
  </div>
</template>

<script>
import { defineComponent, computed } from '@/composables/vue';
import { Icon } from '@/components/iconify/index.js';
import ConfirmCard from './ConfirmCard.vue';
import AskUserCard from './AskUserCard.vue';

export default defineComponent({
  name: 'SubagentHitlCard',
  components: { Icon, ConfirmCard, AskUserCard },
  props: {
    entry: { type: Object, required: true },
    /** 提交外部执行答案，返回 Promise（对应 AskUserCard.onSubmit）。 */
    onAskUserSubmit: { type: Function, default: null },
  },
  emits: ['confirm'],
  setup(props, { emit }) {
    // 成员会话停在「等待确认」还是「等待外部执行结果」，决定用哪种卡片
    const isExternal = computed(() => props.entry.event_type === 'require_external_execution');
    const toolCalls = computed(() => props.entry.event?.tool_calls ?? []);
    const askUserCalls = computed(() => toolCalls.value.filter((tc) => tc.name === 'AskUser'));

    const headerText = computed(() =>
      isExternal.value ? `${props.entry.worker_agent_name} 需要你的输入` : `${props.entry.worker_agent_name} 请求确认`,
    );

    function onConfirm(toolCall, confirm, rules) {
      emit('confirm', toolCall, confirm, rules);
    }

    function onSubmitExternal(toolCall, answers) {
      if (!props.onAskUserSubmit) return Promise.resolve();
      return props.onAskUserSubmit(toolCall, answers);
    }

    return { isExternal, toolCalls, askUserCalls, headerText, onConfirm, onSubmitExternal };
  },
});
</script>
