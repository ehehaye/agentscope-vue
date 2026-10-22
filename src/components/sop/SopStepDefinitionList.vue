<template>
  <div class="tw-flex tw-h-full tw-min-h-0 tw-flex-col">
    <div class="tw-flex tw-h-11 tw-shrink-0 tw-items-center tw-justify-between tw-gap-2 tw-px-5">
      <span class="tw-text-sm tw-font-semibold">步骤定义</span>
      <span class="tw-text-10px tw-text-muted-foreground">{{ steps.length }} 个步骤</span>
    </div>
    <Scrollbar
      class="tw-min-h-0 tw-flex-1 tw-overflow-x-hidden"
      wrap-class="tw-overflow-x-hidden tw-px-5 tw-pb-5"
    >
      <div class="tw-space-y-2">
        <div
          v-for="(step, index) in steps"
          :key="index"
          class="tw-flex tw-gap-3 tw-rounded-lg tw-border tw-border-border tw-p-3"
        >
          <div
            class="tw-flex tw-h-6 tw-w-6 tw-shrink-0 tw-items-center tw-justify-center tw-rounded-full tw-bg-muted tw-text-xs tw-font-medium"
          >
            {{ index + 1 }}
          </div>
          <div class="tw-flex tw-min-w-0 tw-flex-1 tw-flex-col tw-gap-1">
            <div class="tw-text-sm tw-font-medium">{{ step.subject }}</div>
            <div
              class="tw-line-clamp-3 tw-whitespace-pre-line tw-text-xs tw-text-muted-foreground"
              :title="step.description"
            >
              {{ step.description }}
            </div>
            <div class="tw-mt-1 tw-flex tw-flex-wrap tw-gap-x-4 tw-gap-y-1 tw-text-xs tw-text-muted-foreground">
              <span>执行者：{{ agentDisplayName(agents, step.executor?.agent_id) }}</span>
              <span>验证者：{{ verifierLabel(agents, step) }}</span>
              <span v-if="step.verifier">最多尝试：{{ step.max_attempts }} 次</span>
            </div>
          </div>
        </div>
      </div>
    </Scrollbar>
  </div>
</template>

<script>
import { defineComponent } from '@/composables/vue';
import Scrollbar from '@/components/ui/Scrollbar.vue';
import { agentDisplayName, verifierLabel } from '@/utils/sop';

export default defineComponent({
  name: 'SopStepDefinitionList',
  components: { Scrollbar },
  props: {
    steps: { type: Array, default: () => [] },
    agents: { type: Array, default: () => [] },
  },
  setup() {
    return { agentDisplayName, verifierLabel };
  },
});
</script>
