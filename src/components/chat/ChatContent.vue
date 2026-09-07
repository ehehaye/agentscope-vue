<template>
  <div class="tw-flex tw-h-full tw-w-full tw-flex-col" :class="isEmpty ? 'tw-justify-center' : ''">
    <div v-if="showSpinner" class="tw-flex tw-flex-1 tw-items-center tw-justify-center">
      <Spinner class="tw-h-5 tw-w-5 tw-text-muted-foreground" />
    </div>
    <div v-else-if="isEmpty" class="tw-text-center tw-text-4xl tw-font-light tw-tracking-tight tw-text-foreground">
      {{ TEXT.greeting }}
    </div>
    <MessageScroller v-else :items-length="msgs.length" class="tw-flex-1">
      <div class="tw-flex tw-flex-col tw-gap-6">
        <div v-for="(message, index) in msgs" :key="message.id" class="tw-flex tw-flex-col tw-gap-2">
          <TimeMarker
            v-if="shouldShowMarker(message, msgs[index - 1])"
            :at="new Date(message.created_at)"
            :previous="previousTimestamp(message, msgs[index - 1])"
          />
          <ASMessageBubble :message="message" />
        </div>
        <div v-if="showMaxItersAlert" class="tw-rounded-md tw-border tw-border-amber-200 tw-bg-amber-50 tw-p-3 tw-text-sm tw-text-amber-900 dark:tw-border-amber-900 dark:tw-bg-amber-950 dark:tw-text-amber-50">
          <div class="tw-flex tw-items-center tw-gap-2 tw-font-medium">
            <Icon icon="lucide:triangle-alert" class="tw-h-4 tw-w-4" />
            {{ TEXT.maxItersExceeded.title }}
          </div>
          <p class="tw-mt-1 tw-text-xs">{{ TEXT.maxItersExceeded.description }}</p>
          <el-button size="mini" class="tw-mt-2" @click="continueAfterMaxIters">
            {{ TEXT.maxItersExceeded.continue }}
          </el-button>
        </div>
      </div>
    </MessageScroller>

    <div v-if="!loading" class="tw-relative tw-w-full tw-p-4">
      <FlipCard
        :visible="showFlipCard"
        class="tw-absolute tw-bottom-full tw-left-0 tw-right-0 tw-z-50 tw-mb-2 tw-w-full"
      >
        <ConfirmCard
          v-if="pendingToolCall"
          :tool-call="pendingToolCall.toolCall"
          @confirm="(confirm, rules) => onUserConfirm(pendingToolCall.toolCall, confirm, pendingToolCall.replyId, rules)"
        />
        <SubagentHitlCard
          v-for="entry in subagentHitl"
          :key="hitlKey(entry)"
          :entry="entry"
          @confirm="(toolCall, confirm, rules) => onSubagentConfirm(entry, toolCall, confirm, rules)"
        />
      </FlipCard>
      <TextInput
        class="tw-mt-2 tw-w-full tw-rounded-32px tw-bg-muted tw-p-1"
        :disabled="disabled"
        :phase="phase"
        :allowed-input-types="allowedInputTypes"
        @send="onSend"
        @interrupt="onInterrupt"
      >
        <template #header>
          <div class="tw-flex tw-w-full tw-items-center tw-px-2 tw-py-1">
            <WorkingDirectoryDialog
              :agent-id="agentId"
              :session-id="sessionId"
              :value="cwd"
              @change="(v) => $emit('cwd-change', v)"
            />
          </div>
        </template>
      </TextInput>
    </div>
  </div>
</template>

<script>
import { defineComponent, computed, ref, watch, onUnmounted } from '@/composables/vue';
import { Icon } from '@iconify/vue2';
import { getContentBlocks } from '@agentscope-ai/agentscope/message';
import { ReplyFinishedReason } from '@agentscope-ai/agentscope/event';
import Spinner from '@/components/ui/Spinner.vue';
import MessageScroller from './MessageScroller.vue';
import ASMessageBubble from './ASMessageBubble.vue';
import TextInput from './TextInput.vue';
import FlipCard from './FlipCard.vue';
import ConfirmCard from './ConfirmCard.vue';
import SubagentHitlCard from './SubagentHitlCard.vue';
import TimeMarker from './TimeMarker.vue';
import WorkingDirectoryDialog from '@/components/dialog/WorkingDirectoryDialog.vue';
import { TEXT } from './text';

const TIME_MARKER_GAP_MS = 10 * 60 * 1000;
const SPINNER_DELAY_MS = 150;

export default defineComponent({
  name: 'ChatContent',
  components: { Icon, Spinner, MessageScroller, ASMessageBubble, TextInput, FlipCard, ConfirmCard, SubagentHitlCard, TimeMarker, WorkingDirectoryDialog },
  props: {
    msgs: { type: Array, default: () => [] },
    loading: { type: Boolean, default: false },
    phase: { type: String, default: 'idle' },
    disabled: { type: Boolean, default: false },
    allowedInputTypes: { type: Array, default: () => [] },
    subagentHitl: { type: Array, default: () => [] },
    agentId: { type: String, default: null },
    sessionId: { type: String, default: null },
    cwd: { type: String, default: null },
  },
  emits: ['send', 'user-confirm', 'subagent-confirm', 'interrupt', 'cwd-change'],
  setup(props, { emit }) {
    const isEmpty = computed(() => !props.loading && props.msgs.length === 0);

    // spinner 延迟显示，避免短加载闪烁
    const showSpinner = ref(false);
    let spinnerTimer = null;
    watch(
      () => props.loading,
      (loading) => {
        if (loading) {
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
      const asking = getContentBlocks(lastMsg, 'tool_call').filter((tc) => tc.state === 'asking');
      if (asking.length === 0) return null;
      return { replyId: lastMsg.id, toolCall: asking[0] };
    });

    const showFlipCard = computed(
      () => !!pendingToolCall.value || props.subagentHitl.length > 0,
    );

    const showMaxItersAlert = computed(
      () =>
        props.msgs.length > 0 &&
        props.msgs[props.msgs.length - 1].finished_reason === ReplyFinishedReason.EXCEED_MAX_ITERS &&
        props.phase === 'idle',
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

    function hitlKey(entry) {
      return `${entry.worker_session_id}:${entry.reply_id}`;
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
          text: TEXT.maxItersExceeded.continue,
          created_at: new Date().toISOString(),
          finished_at: new Date().toISOString(),
        },
      ]);
    }

    return {
      isEmpty,
      showSpinner,
      pendingToolCall,
      showFlipCard,
      showMaxItersAlert,
      shouldShowMarker,
      previousTimestamp,
      onSend,
      onUserConfirm,
      hitlKey,
      onSubagentConfirm,
      onInterrupt,
      continueAfterMaxIters,
      TEXT,
    };
  },
});
</script>
