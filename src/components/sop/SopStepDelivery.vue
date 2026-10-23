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
    <Collapsible stretch>
      <template #trigger>
        <span class="tw-text-sm tw-font-medium">{{ step.definition.subject }}</span>
      </template>
      <p class="tw-mt-1 tw-whitespace-pre-line tw-text-sm tw-text-muted-foreground">
        {{ step.definition.description }}
      </p>
      <div class="tw-mt-2 tw-flex tw-flex-wrap tw-gap-x-4 tw-gap-y-1 tw-text-xs tw-text-muted-foreground">
        <span>执行者：{{ agentDisplayName(agents, step.definition.executor?.agent_id) }}</span>
        <span>验证者：{{ verifierLabel(agents, step.definition) }}</span>
        <span v-if="step.definition.verifier">最多尝试：{{ step.definition.max_attempts }} 次</span>
      </div>
    </Collapsible>

    <Collapsible
      default-open
      stretch
    >
      <template #trigger>
        <span class="tw-text-sm tw-font-medium">交付内容</span>
      </template>
      <div
        v-if="submissionBlocks.length > 0"
        class="tw-relative tw-mt-2"
      >
        <div
          id="as-sop-delivery-content"
          class="tw-rounded-lg tw-border tw-border-border tw-p-4"
        >
          <ASBlock
            v-for="(block, index) in submissionBlocks"
            :key="block.id || index"
            :block="block"
          />
        </div>
        <ExportButton
          type="word"
          class="tw-absolute tw-bottom-3 tw-right-3"
          :msgs="exportMsgs"
          :filename="exportFilename"
        />
      </div>
      <div
        v-else
        class="tw-mt-2 tw-rounded-lg tw-border tw-border-dashed tw-border-border tw-py-8 tw-text-center tw-text-sm tw-text-muted-foreground"
      >
        {{ emptySubmissionText }}
      </div>
    </Collapsible>

    <Collapsible
      v-if="verifications.length > 0"
      default-open
      stretch
    >
      <template #trigger>
        <span class="tw-text-sm tw-font-medium">验证记录</span>
      </template>
      <div class="tw-mt-2 tw-space-y-2">
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
            <span class="tw-ml-auto tw-text-muted-foreground">{{ formatTime(verification.created_at) }}</span>
          </div>
          <p
            v-if="verification.message"
            class="tw-mt-1 tw-whitespace-pre-wrap"
          >
            {{ verification.message }}
          </p>
        </div>
      </div>
    </Collapsible>

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
import Collapsible from '@/components/ui/Collapsible.vue';
import ASBlock from '@/components/chat/ASBlock.vue';
import ExportButton from '@/components/exports/ExportButton.vue';
import { agentDisplayName, verifierLabel } from '@/utils/sop';

export default defineComponent({
  name: 'SopStepDelivery',
  components: { Collapsible, ASBlock, ExportButton },
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

    // 交付内容是 SDK content blocks，包成单条 assistant 消息交给导出组件，
    // 组件内部只取 text 块（thinking / tool 等会被跳过）
    const exportMsgs = computed(() =>
      submissionBlocks.value.length ? [{ role: 'assistant', content: submissionBlocks.value }] : [],
    );

    const exportFilename = computed(() => {
      if (!props.step) return '交付内容.docx';
      return `第 ${props.step.index + 1} 步 · ${props.step.definition.subject} - 交付内容.docx`;
    });

    function formatTime(value) {
      return value ? new Date(value).toLocaleString() : '—';
    }

    return {
      submissionBlocks,
      verifications,
      emptySubmissionText,
      exportMsgs,
      exportFilename,
      formatTime,
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
