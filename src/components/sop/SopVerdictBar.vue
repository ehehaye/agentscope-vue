<template>
  <div class="tw-shrink-0 tw-border-t tw-border-yellow-200 tw-bg-yellow-50 tw-px-4 tw-py-2">
    <div class="tw-flex tw-min-w-0 tw-items-baseline tw-gap-2">
      <span class="tw-shrink-0 tw-text-sm tw-font-medium">人工验收</span>
      <span
        class="tw-min-w-0 tw-truncate tw-text-xs tw-text-muted-foreground"
        :title="question"
      >
        {{ question }}
      </span>
    </div>
    <div class="tw-mt-1.5 tw-flex tw-items-start tw-gap-2">
      <el-input
        :value="value"
        type="textarea"
        :autosize="{ minRows: 1, maxRows: 3 }"
        resize="none"
        placeholder="驳回原因（通过时可留空）"
        class="tw-min-w-0 tw-flex-1"
        @input="$emit('input', $event)"
      />
      <div class="tw-flex tw-shrink-0 tw-gap-2">
        <el-button
          size="mini"
          type="primary"
          :loading="submitting"
          @click="$emit('submit', true)"
        >
          通过
        </el-button>
        <el-button
          size="mini"
          type="danger"
          :loading="submitting"
          @click="$emit('submit', false)"
        >
          驳回
        </el-button>
      </div>
    </div>
    <p
      v-if="error"
      class="tw-mt-1 tw-text-xs tw-text-destructive"
    >
      {{ error }}
    </p>
  </div>
</template>

<script>
import { defineComponent } from '@/composables/vue';

export default defineComponent({
  name: 'SopVerdictBar',
  props: {
    question: { type: String, default: '' },
    value: { type: String, default: '' },
    submitting: { type: Boolean, default: false },
    error: { type: String, default: '' },
  },
});
</script>
