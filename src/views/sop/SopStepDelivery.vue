<template>
  <div
    v-if="!step"
    class="tw-flex tw-h-full tw-items-center tw-justify-center"
  >
    <p class="tw-text-xs tw-text-muted-foreground">选择上方步骤查看交付内容。</p>
  </div>

  <div
    v-else
    class="tw-flex tw-flex-col tw-gap-5"
  >
    <section>
      <div class="tw-flex tw-flex-wrap tw-items-center tw-gap-2">
        <span class="tw-text-base tw-font-medium">第 {{ step.index + 1 }} 步 · {{ step.definition.subject }}</span>
        <StatusBadge :status="step.state.phase || 'pending'" />
      </div>
      <p class="tw-mt-1 tw-text-sm tw-text-muted-foreground">{{ step.definition.description }}</p>
      <div class="tw-mt-2 tw-flex tw-flex-wrap tw-gap-x-4 tw-gap-y-1 tw-text-xs tw-text-muted-foreground">
        <span>执行者：{{ agentDisplayName(agents, step.definition.executor?.agent_id) }}</span>
        <span>验证者：{{ verifierLabel(agents, step.definition) }}</span>
        <span>最多尝试：{{ step.definition.max_attempts }} 次</span>
      </div>
    </section>

    <section>
      <div class="tw-mb-2 tw-flex tw-items-center tw-justify-between tw-gap-2">
        <span class="tw-text-sm tw-font-semibold">交付内容</span>
        <PrintHistoryButton
          v-if="submissionBlocks.length > 0"
          target="#as-sop-delivery-content"
          :title="printTitle"
        />
      </div>
      <div
        v-if="submissionBlocks.length > 0"
        id="as-sop-delivery-content"
        class="tw-rounded-lg tw-border tw-border-border tw-p-4"
      >
        <ASBlock
          v-for="(block, index) in submissionBlocks"
          :key="block.id || index"
          :block="block"
        />
      </div>
      <div
        v-else
        class="tw-rounded-lg tw-border tw-border-dashed tw-border-border tw-py-8 tw-text-center tw-text-sm tw-text-muted-foreground"
      >
        {{ emptySubmissionText }}
      </div>
    </section>

    <section v-if="verifications.length > 0">
      <div class="tw-mb-2 tw-text-sm tw-font-semibold">验证记录</div>
      <div class="tw-space-y-2">
        <div
          v-for="(verification, index) in verifications"
          :key="index"
          class="tw-rounded-md tw-border tw-border-border tw-p-3 tw-text-xs"
        >
          <div class="tw-flex tw-flex-wrap tw-items-center tw-gap-2">
            <span :class="verification.passed ? 'tw-text-green-600' : 'tw-text-red-600'">
              {{ verification.passed ? '通过' : '驳回' }}
            </span>
            <span class="tw-text-muted-foreground">{{ verification.verifier }}</span>
          </div>
          <p
            v-if="verification.message"
            class="tw-mt-1 tw-whitespace-pre-wrap"
          >
            {{ verification.message }}
          </p>
        </div>
      </div>
    </section>

    <div
      v-if="step.state.phase === 'awaiting' && !awaitingHuman"
      class="tw-text-xs tw-text-muted-foreground"
    >
      等待工具授权，请到「会话」标签页处理。
    </div>
  </div>
</template>

<script>
import { defineComponent, computed } from '@/composables/vue';
import StatusBadge from '@/components/badge/StatusBadge.vue';
import ASBlock from '@/components/chat/ASBlock.vue';
import PrintHistoryButton from '@/components/chat/PrintHistoryButton.vue';
import { agentDisplayName, verifierLabel } from './sop-utils';

export default defineComponent({
  name: 'SopStepDelivery',
  components: { StatusBadge, ASBlock, PrintHistoryButton },
  props: {
    step: { type: Object, default: null },
    agents: { type: Array, default: () => [] },
    awaitingHuman: { type: Boolean, default: false },
  },
  setup(props) {
    const submissionBlocks = computed(() => {
      const submission = props.step?.state?.submission;
      return Array.isArray(submission) ? submission : [];
    });

    const verifications = computed(() => props.step?.state?.verifications ?? []);

    const emptySubmissionText = computed(() => {
      const phase = props.step?.state?.phase || 'pending';
      if (phase === 'pending') return '尚未开始';
      return '尚未交付';
    });

    const printTitle = computed(() => {
      if (!props.step) return '交付内容';
      return `第 ${props.step.index + 1} 步 · ${props.step.definition.subject} - 交付内容`;
    });

    return {
      submissionBlocks,
      verifications,
      emptySubmissionText,
      printTitle,
      agentDisplayName,
      verifierLabel,
    };
  },
});
</script>

<style lang="less">
@media print {
  #as-sop-delivery-content {
    display: block !important;
    width: 100% !important;
    max-width: none !important;
    margin: 0 !important;
    padding: 0 !important;
    border: none !important;
    background: #fff !important;
    color: #000 !important;
    font-size: 12pt;
    line-height: 1.6;
  }

  #as-sop-delivery-content pre,
  #as-sop-delivery-content code {
    white-space: pre-wrap !important;
    word-break: break-word !important;
    background: #f5f5f5 !important;
    color: #111 !important;
    border: 1px solid #ddd !important;
  }
}
</style>
