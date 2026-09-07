<template>
  <div class="flex h-full w-full flex-col" :class="isEmpty ? 'justify-center' : ''">
    <div v-if="showSpinner" class="flex flex-1 items-center justify-center">
      <Spinner class="h-5 w-5 text-muted-foreground" />
    </div>
    <div v-else-if="isEmpty" class="text-center text-4xl font-light tracking-tight text-foreground">
      {{ TEXT.greeting }}
    </div>
    <MessageScroller v-else :items-length="msgs.length" class="flex-1">
      <div class="flex flex-col gap-6">
        <div v-for="(message, index) in msgs" :key="message.id" class="flex flex-col gap-2">
          <TimeMarker
            v-if="shouldShowMarker(message, msgs[index - 1])"
            :at="new Date(message.created_at)"
            :previous="previousTimestamp(message, msgs[index - 1])"
          />
          <ASMessageBubble :message="message" />
        </div>
        <div v-if="showMaxItersAlert" class="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-50">
          <div class="flex items-center gap-2 font-medium">
            <Icon icon="lucide:triangle-alert" class="h-4 w-4" />
            {{ TEXT.maxItersExceeded.title }}
          </div>
          <p class="mt-1 text-xs">{{ TEXT.maxItersExceeded.description }}</p>
          <el-button size="mini" class="mt-2" @click="continueAfterMaxIters">
            {{ TEXT.maxItersExceeded.continue }}
          </el-button>
        </div>
      </div>
    </MessageScroller>

    <div v-if="!loading" class="relative w-full p-4">
      <FlipCard
        :visible="showFlipCard"
        class="absolute bottom-full left-0 right-0 z-50 mb-2 w-full"
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
        class="mt-2 w-full tw-rounded-32px bg-muted p-1"
        :disabled="disabled"
        :phase="phase"
        :allowed-input-types="allowedInputTypes"
        @send="onSend"
        @interrupt="onInterrupt"
      >
        <template #header>
          <div class="flex w-full items-center px-2 py-1">
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
