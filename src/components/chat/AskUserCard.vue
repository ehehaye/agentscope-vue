<template>
  <div class="tw-mb-2 tw-w-full tw-space-y-3 tw-rounded-28px tw-bg-muted tw-px-5 tw-py-4 tw-ring-1 tw-ring-border">
    <!-- <div class="tw-text-sm tw-font-medium tw-text-secondary-foreground">Agent 需要你的输入</div> -->

    <!-- input 解析失败时退回原始 JSON -->
    <div
      v-if="questions.length === 0"
      class="tw-max-h-200px tw-overflow-y-auto tw-rounded-sm tw-bg-background tw-px-3 tw-py-2 tw-text-xs"
    >
      <pre class="tw-whitespace-pre-wrap tw-break-all">{{ toolCall.input }}</pre>
    </div>

    <el-scrollbar
      v-else
      class="tw-flex tw-flex-col tw-gap-y-4 tw--mr-2"
      :style="{
        maxHeight: 'min(40vh, 400px)',
      }"
    >
      <div
        v-for="(q, qi) in questions"
        :key="qi"
        class="tw-flex tw-flex-col tw-gap-y-2 tw-pr-2"
      >
        <div class="tw-flex tw-items-center tw-gap-x-2">
          <span
            class="tw-rounded-full tw-bg-background tw-px-2 tw-py-0.5 tw-text-xs tw-font-medium tw-text-secondary-foreground"
          >
            {{ q.header }}
          </span>
          <span class="tw-text-xs tw-text-muted-foreground">
            {{ q.multi_select ? '可多选' : '单选' }}
          </span>
        </div>

        <span class="tw-text-sm tw-text-secondary-foreground">{{ q.question }}</span>

        <div
          v-if="q.context"
          class="tw-max-h-200px tw-overflow-y-auto tw-whitespace-pre-wrap tw-rounded-sm tw-bg-background tw-px-3 tw-py-2 tw-text-xs tw-text-muted-foreground"
        >
          {{ q.context }}
        </div>

        <div class="ask-options">
          <el-radio-group
            v-if="!q.multi_select"
            :value="answers[qi].selected[0] || ''"
            :disabled="submitting"
            @input="(v) => setSingle(qi, v)"
          >
            <el-radio
              v-for="opt in q.options"
              :key="opt.label"
              :label="opt.label"
              class="ask-option"
            >
              <span class="tw-flex tw-min-w-0 tw-flex-col tw-items-start">
                <span class="tw-break-words tw-whitespace-normal">{{ opt.label }}</span>
                <span
                  v-if="opt.description"
                  class="tw-break-words tw-whitespace-normal tw-text-xs tw-text-muted-foreground"
                >
                  {{ opt.description }}
                </span>
              </span>
            </el-radio>
          </el-radio-group>

          <el-checkbox-group
            v-else
            v-model="answers[qi].selected"
            :disabled="submitting"
          >
            <el-checkbox
              v-for="opt in q.options"
              :key="opt.label"
              :label="opt.label"
              class="ask-option"
            >
              <span class="tw-flex tw-min-w-0 tw-flex-col tw-items-start">
                <span class="tw-break-words tw-whitespace-normal">{{ opt.label }}</span>
                <span
                  v-if="opt.description"
                  class="tw-break-words tw-whitespace-normal tw-text-xs tw-text-muted-foreground"
                >
                  {{ opt.description }}
                </span>
              </span>
            </el-checkbox>
          </el-checkbox-group>
        </div>

        <!-- 「其他」选项由客户端补上，后端不会下发 -->
        <div class="tw-flex tw-items-center tw-gap-x-2 tw-px-1 tw-py-1">
          <el-input
            clearable
            class="ask-other-input tw-flex-1 tw-rounded-28px"
            :value="answers[qi].other"
            size="small"
            placeholder="输入你的答案..."
            :disabled="submitting"
            @input="(v) => setOther(qi, v)"
          />

          <!-- 提交按钮与最后一个输入框并排放在右侧 -->
          <el-button
            v-if="qi === questions.length - 1"
            type="primary"
            size="small"
            circle
            :loading="submitting"
            :disabled="!ready || submitting"
            @click="handleSubmit"
          >
            <Icon
              icon="lucide:arrow-up"
              class="tw-h-4 tw-w-4"
            />
          </el-button>
        </div>
      </div>
    </el-scrollbar>
  </div>
</template>

<script>
import { defineComponent, ref, computed } from '@/composables/vue';
import { Icon } from '@/components/iconify/index';

/** 解析 toolCall.input（JSON 字符串）中的 questions。 */
function parseQuestions(input) {
  try {
    const parsed = JSON.parse(input);
    return Array.isArray(parsed.questions) ? parsed.questions : [];
  } catch {
    return [];
  }
}

/**
 * AskUser 工具调用的交互卡片 —— 外部执行 HITL 流程。
 * Agent 会停在该调用上（tool_call 处于 submitted 状态），直到用户作答；
 * onSubmit 随后 POST 一个 ExternalExecutionResultEvent，回复随即恢复流式输出。
 *
 * 与 ConfirmCard 共用同一插槽，样式保持一致的卡片外壳。
 */
export default defineComponent({
  name: 'AskUserCard',
  components: { Icon },
  props: {
    toolCall: { type: Object, required: true },
    /** 提交答案，返回 Promise；resolve 后卡片随会话恢复而消失。 */
    onSubmit: { type: Function, default: null },
  },
  setup(props) {
    const questions = computed(() => parseQuestions(props.toolCall.input));
    const answers = ref(questions.value.map(() => ({ selected: [], other: '' })));
    const submitting = ref(false);

    function setSingle(qi, label) {
      answers.value = answers.value.map((a, i) => (i === qi ? { ...a, selected: label ? [label] : [] } : a));
    }

    function setOther(qi, other) {
      answers.value = answers.value.map((a, i) => (i === qi ? { ...a, other } : a));
    }

    const ready = computed(
      () =>
        questions.value.length > 0 &&
        questions.value.every(
          (_, i) => answers.value[i].selected.length > 0 || answers.value[i].other.trim().length > 0,
        ),
    );

    async function handleSubmit() {
      if (submitting.value || !ready.value) return;
      submitting.value = true;

      const payload = questions.value.map((q, i) => {
        const other = answers.value[i].other.trim();
        const item = { question: q.question, selected: answers.value[i].selected };
        if (other) item.other = other;
        return item;
      });

      try {
        if (props.onSubmit) await props.onSubmit(payload);
      } catch {
        // 提交失败：恢复可交互，会话仍停在等待状态，允许重试。
        submitting.value = false;
      }
    }

    return { questions, answers, submitting, setSingle, setOther, ready, handleSubmit };
  },
});
</script>

<style lang="less" scoped>
.ask-options {
  display: flex;
  flex-direction: column;

  ::v-deep .el-radio-group,
  ::v-deep .el-checkbox-group {
    display: flex;
    flex-direction: column;
    font-size: inherit;
    line-height: inherit;
  }

  /* 选项整行卡片化：全宽、大行高可点区域、hover 底色反馈 */
  ::v-deep .el-radio,
  ::v-deep .el-checkbox {
    display: flex;
    align-items: flex-start;
    width: 100%;
    height: auto;
    margin-right: 0;
    padding: 6px 8px;
    border-radius: 6px;
    color: var(--as-foreground);
    line-height: 1.5;
    white-space: normal;
    transition: background-color 0.15s;
  }

  ::v-deep .el-radio:hover,
  ::v-deep .el-checkbox:hover {
    background-color: var(--as-accent);
  }

  /* 圈点与首行文字对齐 */
  ::v-deep .el-radio__input,
  ::v-deep .el-checkbox__input {
    margin-top: 2px;
    line-height: 1;
  }

  ::v-deep .el-checkbox__inner,
  ::v-deep .el-radio__inner {
    width: 16px;
    height: 16px;
  }

  ::v-deep .el-radio__inner::after {
    width: 6px;
    height: 6px;
  }

  ::v-deep .el-checkbox__inner::after {
    left: 5px;
    top: 2px;
  }

  ::v-deep .el-radio__label,
  ::v-deep .el-checkbox__label {
    flex: 1;
    min-width: 0;
    padding-left: 8px;
    font-size: inherit;
    font-weight: normal;
    line-height: inherit;
  }
}

/* tw-rounded-28px 只作用于 el-input 外壳，真正的边框在内部 __inner 上，需要同步圆角 */
.ask-other-input {
  ::v-deep .el-input__inner {
    border-radius: 28px;
  }
}
</style>
