<template>
  <div
    class="tw-flex tw-h-full tw-w-full tw-flex-col"
    :class="isEmpty ? 'tw-justify-center' : ''"
  >
    <div
      v-if="showSpinner"
      class="tw-flex tw-flex-1 tw-items-center tw-justify-center"
    >
      <Spinner class="tw-h-5 tw-w-5 tw-text-muted-foreground" />
    </div>
    <div
      v-else-if="isEmpty"
      class="tw-flex tw-flex-1 tw-items-center tw-justify-center"
    >
      <div class="tw-text-center tw-text-4xl tw-font-light tw-tracking-tight tw-text-foreground">
        有什么可以帮你的？
      </div>
    </div>
    <MessageScroller
      v-else
      :items-length="msgs.length"
      class="tw-flex-1"
    >
      <div
        id="as-chat-history"
        class="tw-flex tw-flex-col tw-gap-6"
      >
        <div
          v-for="(message, index) in msgs"
          :key="message.id"
          class="tw-flex tw-flex-col tw-gap-2"
        >
          <TimeMarker
            v-if="shouldShowMarker(message, msgs[index - 1])"
            :at="new Date(message.created_at)"
            :previous="previousTimestamp(message, msgs[index - 1])"
          />
          <ASMessageBubble :message="message" />
        </div>
        <div
          v-if="showMaxItersAlert"
          class="tw-rounded-md tw-border tw-border-amber-200 tw-bg-amber-50 tw-p-3 tw-text-sm tw-text-amber-900 dark:tw-border-amber-900 dark:tw-bg-amber-950 dark:tw-text-amber-50"
        >
          <div class="tw-flex tw-items-center tw-gap-2 tw-font-medium">
            <Icon
              icon="lucide:triangle-alert"
              class="tw-h-4 tw-w-4"
            />
            达到最大迭代次数
          </div>
          <p class="tw-mt-1 tw-text-xs">本轮回复已达到最大迭代次数限制。</p>
          <el-button
            size="mini"
            class="tw-mt-2"
            @click="continueAfterMaxIters"
          >
            继续
          </el-button>
        </div>
      </div>
    </MessageScroller>

    <div class="tw-relative tw-w-full tw-p-4">
      <FlipCard
        :visible="showFlipCard"
        class="tw-w-full"
      >
        <ConfirmCard
          v-if="pendingToolCall"
          :tool-call="pendingToolCall.toolCall"
          @confirm="
            (confirm, rules) => onUserConfirm(pendingToolCall.toolCall, confirm, pendingToolCall.replyId, rules)
          "
        />
        <AskUserCard
          v-if="pendingAskUser"
          :key="pendingAskUser.toolCall.id"
          :tool-call="pendingAskUser.toolCall"
          :on-submit="submitAskUser"
        />
        <SubagentHitlCard
          v-for="entry in subagentHitl"
          :key="hitlKey(entry)"
          :entry="entry"
          :on-ask-user-submit="(toolCall, answers) => submitSubagentAskUser(entry, toolCall, answers)"
          @confirm="(toolCall, confirm, rules) => onSubagentConfirm(entry, toolCall, confirm, rules)"
        />
      </FlipCard>
      <TextInput
        class="tw-mt-2 tw-w-full tw-rounded-32px tw-bg-muted tw-p-1"
        :disabled="disabled"
        :phase="inputPhase"
        :error="error"
        :allowed-input-types="allowedInputTypes"
        :exportable="msgs.length > 0"
        @send="onSend"
        @interrupt="onInterrupt"
      >
        <template #actions>
          <WorkingDirectoryDialog
            :agent-id="agentId"
            :session-id="sessionId"
            :value="cwd"
            :on-change="onCwdChange"
          />
        </template>
      </TextInput>
    </div>
  </div>
</template>

<script>
import { defineComponent, computed, ref, watch, onUnmounted } from '@/composables/vue';
import { Icon } from '@/components/ui/Icon';
import { getContentBlocks } from '@agentscope-ai/agentscope/message';
import { ReplyFinishedReason } from '@agentscope-ai/agentscope/event';
import { SdkBlockType, SdkToolCallState } from '@/constants/protocol';
import { AppConnectionState, AppReplyPhase } from '@/constants/app-state';
import { hitlKey } from '@/utils/agentscope';
import Spinner from '@/components/ui/Spinner.vue';
import MessageScroller from './MessageScroller.vue';
import ASMessageBubble from './ASMessageBubble.vue';
import TextInput from './TextInput.vue';
import FlipCard from './FlipCard.vue';
import ConfirmCard from './ConfirmCard.vue';
import AskUserCard from './AskUserCard.vue';
import SubagentHitlCard from './SubagentHitlCard.vue';
import TimeMarker from './TimeMarker.vue';
import WorkingDirectoryDialog from '@/components/dialog/WorkingDirectoryDialog.vue';

const TIME_MARKER_GAP_MS = 10 * 60 * 1000;
const SPINNER_DELAY_MS = 150;

export default defineComponent({
  name: 'ChatContent',
  components: {
    Icon,
    Spinner,
    MessageScroller,
    ASMessageBubble,
    TextInput,
    FlipCard,
    ConfirmCard,
    AskUserCard,
    SubagentHitlCard,
    TimeMarker,
    WorkingDirectoryDialog,
  },
  props: {
    /** SDK 的 `Msg[]`（由 appendEvent 维护） */
    msgs: { type: Array, default: () => [] },
    /** 会话未就绪（创建/拉历史/建连中），来自本应用的 chat/preparing getter */
    loading: { type: Boolean, default: false },
    /** 回复相位，取值见 AppReplyPhase（本应用自定义） */
    phase: { type: String, default: AppReplyPhase.IDLE },
    error: { type: [Object, String, Error], default: null },
    disabled: { type: Boolean, default: false },
    allowedInputTypes: { type: Array, default: () => [] },
    subagentHitl: { type: Array, default: () => [] },
    agentId: { type: String, default: null },
    sessionId: { type: String, default: null },
    cwd: { type: String, default: null },
    /** 提交 AskUser 答案（外部执行 HITL），返回 Promise。 */
    onAskUserSubmit: { type: Function, default: null },
    /** 提交子代理 AskUser 答案（外部执行 HITL），返回 Promise。 */
    onSubagentAskUserSubmit: { type: Function, default: null },
    /** 保存工作目录，返回 Promise，失败时留在弹窗内提示。 */
    onCwdChange: { type: Function, default: null },
  },
  emits: ['send', 'user-confirm', 'subagent-confirm', 'interrupt'],
  setup(props, { emit }) {
    const isEmpty = computed(() => !props.loading && props.msgs.length === 0);

    // 输入框相位：会同时出现两套本应用自定义取值——AppReplyPhase（回复相位）与
    // AppConnectionState.LOADING（会话未就绪），后者用于在历史/建连期间禁用发送。
    // 切换会话加载历史期间：输入框保持挂载，避免被内容区加载态遮挡
    const inputPhase = computed(() => (props.loading ? AppConnectionState.LOADING : props.phase));

    // spinner 延迟显示，避免短加载闪烁。
    // 仅在「加载中且还没有内容可展示」时占位：loading 会一直持续到 SSE 建连完成，
    // 若期间历史已加载，不能再被 spinner 盖住。
    const showSpinner = ref(false);
    let spinnerTimer = null;
    watch(
      () => props.loading && props.msgs.length === 0,
      (shouldPlaceholder) => {
        if (shouldPlaceholder) {
          spinnerTimer = setTimeout(() => {
            showSpinner.value = true;
          }, SPINNER_DELAY_MS);
        } else {
          clearTimeout(spinnerTimer);
          spinnerTimer = null;
          showSpinner.value = false;
        }
      },
      { immediate: true },
    );
    onUnmounted(() => {
      clearTimeout(spinnerTimer);
    });

    const pendingToolCall = computed(() => {
      if (props.msgs.length === 0) return null;
      const lastMsg = props.msgs[props.msgs.length - 1];
      const asking = getContentBlocks(lastMsg, SdkBlockType.TOOL_CALL).filter(
        (tc) => tc.state === SdkToolCallState.ASKING,
      );
      if (asking.length === 0) return null;
      return { replyId: lastMsg.id, toolCall: asking[0] };
    });

    // AskUser 调用停在 submitted 状态（外部 HITL），与询问确认的 asking 不同
    const pendingAskUser = computed(() => {
      if (props.msgs.length === 0) return null;
      const lastMsg = props.msgs[props.msgs.length - 1];
      const pending = getContentBlocks(lastMsg, SdkBlockType.TOOL_CALL).filter(
        (tc) => tc.name === 'AskUser' && tc.state === SdkToolCallState.SUBMITTED,
      );
      if (pending.length === 0) return null;
      return { replyId: lastMsg.id, toolCall: pending[0] };
    });

    const showFlipCard = computed(
      () => !!pendingToolCall.value || !!pendingAskUser.value || props.subagentHitl.length > 0,
    );

    function submitAskUser(answers) {
      if (!pendingAskUser.value || !props.onAskUserSubmit) return Promise.resolve();
      const { toolCall, replyId } = pendingAskUser.value;
      return props.onAskUserSubmit(toolCall, replyId, answers);
    }

    function submitSubagentAskUser(entry, toolCall, answers) {
      if (!props.onSubagentAskUserSubmit) return Promise.resolve();
      return props.onSubagentAskUserSubmit(entry, toolCall, answers);
    }

    const showMaxItersAlert = computed(
      () =>
        props.msgs.length > 0 &&
        props.msgs[props.msgs.length - 1].finished_reason === ReplyFinishedReason.EXCEED_MAX_ITERS &&
        props.phase === AppReplyPhase.IDLE,
    );

    function previousTimestamp(message, previous) {
      if (!previous) return new Date(message.created_at);
      return new Date(previous.finished_at || previous.created_at);
    }

    function shouldShowMarker(message, previous) {
      if (!previous) return false;
      const at = new Date(message.created_at).getTime();
      const prev = previousTimestamp(message, previous).getTime();
      return at - prev > TIME_MARKER_GAP_MS;
    }

    function onSend(blocks) {
      emit('send', blocks);
    }

    function onUserConfirm(toolCall, confirm, replyId, rules) {
      emit('user-confirm', { toolCall, confirm, replyId, rules });
    }

    function onSubagentConfirm(entry, toolCall, confirm, rules) {
      emit('subagent-confirm', { entry, toolCall, confirm, rules });
    }

    function onInterrupt() {
      emit('interrupt');
    }

    function continueAfterMaxIters() {
      emit('send', [
        {
          id: crypto.randomUUID(),
          type: 'text',
          text: '继续',
          created_at: new Date().toISOString(),
          finished_at: new Date().toISOString(),
        },
      ]);
    }

    return {
      isEmpty,
      inputPhase,
      showSpinner,
      pendingToolCall,
      pendingAskUser,
      showFlipCard,
      showMaxItersAlert,
      shouldShowMarker,
      previousTimestamp,
      onSend,
      onUserConfirm,
      submitAskUser,
      submitSubagentAskUser,
      hitlKey,
      onSubagentConfirm,
      onInterrupt,
      continueAfterMaxIters,
    };
  },
});
</script>
