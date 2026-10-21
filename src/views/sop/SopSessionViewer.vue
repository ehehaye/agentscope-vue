<template>
  <div
    ref="rootEl"
    class="tw-flex tw-h-full tw-min-h-0 tw-flex-col"
  >
    <div
      v-if="entries.length === 0"
      class="tw-flex tw-flex-1 tw-items-center tw-justify-center tw-p-6"
    >
      <p class="tw-text-xs tw-text-muted-foreground">暂无会话，步骤开始后会自动创建。</p>
    </div>

    <template v-else>
      <div class="tw-flex tw-shrink-0 tw-items-center tw-gap-2 tw-border-b tw-border-border tw-px-3 tw-py-1.5">
        <span class="tw-shrink-0 tw-text-xs tw-font-semibold">会话</span>
        <template v-if="activeEntry">
          <span class="tw-font-mono tw-text-xs tw-font-medium">{{ activeEntry.session_key }}</span>
          <span class="tw-text-10px tw-text-muted-foreground">
            {{ agentName(activeEntry.agent_id) }}{{ activeEntry.session_id ? '' : ' · 未创建' }}
          </span>
        </template>
        <span
          v-else
          class="tw-text-10px tw-text-muted-foreground"
          >未创建</span
        >
        <ConnectionStatus
          v-if="hasActiveSession"
          :connection="connection"
          class="tw-ml-auto tw-shrink-0"
        />
      </div>

      <div class="tw-min-h-0 tw-flex-1 tw-px-2 tw-py-2">
        <div
          v-if="!activeEntry"
          class="tw-flex tw-h-full tw-items-center tw-justify-center"
        >
          <p class="tw-text-xs tw-text-muted-foreground">当前步骤还没有会话。</p>
        </div>
        <div
          v-else-if="!activeEntry.session_id"
          class="tw-flex tw-h-full tw-items-center tw-justify-center"
        >
          <p class="tw-text-xs tw-text-muted-foreground">会话尚未创建，等待步骤开始。</p>
        </div>
        <ChatContent
          v-else
          :msgs="msgs"
          :loading="loading"
          :phase="phase"
          :error="error"
          :subagent-hitl="subagentHitl"
          :agent-id="agentId"
          :session-id="sessionId"
          :cwd="null"
          :on-ask-user-submit="handleAskUserSubmit"
          :on-subagent-ask-user-submit="handleSubagentAskUserSubmit"
          :on-cwd-change="noop"
          hide-input
          empty-text="会话暂无消息"
          @send="handleSend"
          @user-confirm="handleUserConfirm"
          @subagent-confirm="handleSubagentConfirm"
          @interrupt="interrupt"
        />
      </div>
    </template>
  </div>
</template>

<script>
import { defineComponent, ref, computed, watch, onUnmounted, nextTick } from '@/composables/vue';
import { useMessages } from '@/composables/useMessages';
import { provideAudioCenter } from '@/composables/useAudioCenter';
import ChatContent from '@/components/chat/ChatContent.vue';
import ConnectionStatus from '@/components/chat/ConnectionStatus.vue';
import { agentDisplayName, findStepMessageIndex } from './sop-utils';

function noop() {
  return null;
}

const MESSAGE_FLASH_ATTR = 'data-sop-flash';
let flashTimer = null;

/**
 * 短暂高亮定位到的消息。
 * 用 data 属性而不是 class：消息节点由 Vue 管理，重新渲染会用绑定的 class 覆盖手动添加的类。
 */
function flashMessage(el) {
  if (flashTimer) clearTimeout(flashTimer);
  el.removeAttribute(MESSAGE_FLASH_ATTR);
  // 读取布局属性强制重排，让移除 / 添加属性之间的动画重新触发。
  void el.offsetWidth;
  el.setAttribute(MESSAGE_FLASH_ATTR, '');
  flashTimer = setTimeout(() => {
    el.removeAttribute(MESSAGE_FLASH_ATTR);
    flashTimer = null;
  }, 1600);
}

export default defineComponent({
  name: 'SopSessionViewer',
  components: { ChatContent, ConnectionStatus },
  props: {
    entries: { type: Array, default: () => [] },
    agents: { type: Array, default: () => [] },
    runId: { type: String, default: '' },
    /** 父级受控的激活会话键（由顶部步骤条决定）。 */
    sessionKey: { type: String, default: '' },
    /** 步骤切换后的消息定位请求：{ sessionKey, subject, ids, token }。 */
    focusRequest: { type: Object, default: null },
  },
  setup(props) {
    const rootEl = ref(null);
    const activeKey = computed(() => props.sessionKey || '');
    const pendingFocus = ref(null);

    const activeEntry = computed(() => props.entries.find((entry) => entry.session_key === activeKey.value) || null);
    const agentId = computed(() => activeEntry.value?.agent_id || null);
    const sessionId = computed(() => activeEntry.value?.session_id || null);
    const hasActiveSession = computed(() => !!sessionId.value);

    watch(
      () => props.runId,
      () => {
        pendingFocus.value = null;
      },
      { immediate: true },
    );

    // 父级切换会话后，属于旧会话的定位请求作废。
    watch(activeKey, (key) => {
      if (pendingFocus.value?.sessionKey && pendingFocus.value.sessionKey !== key) {
        pendingFocus.value = null;
      }
    });

    const audioManager = provideAudioCenter();

    const {
      msgs,
      connection,
      loading,
      phase,
      error,
      subagentHitl,
      send,
      onUserConfirm,
      onSubagentConfirm,
      onAskUserSubmit,
      onSubagentAskUserSubmit,
      interrupt,
      abort,
    } = useMessages(agentId, sessionId, {
      onAudioStart: (blockId, mediaType) => audioManager?.start(blockId, mediaType),
      onAudioAppend: (blockId, data) => audioManager?.append(blockId, data),
      onAudioEnd: (blockId) => audioManager?.end(blockId),
      onAudioStopAll: () => audioManager?.stopAllPlayback(),
    });

    /** 在已加载的消息中定位步骤起点：优先锚点 ID，回退步骤标题标记。 */
    function messageForStep(request) {
      const index = findStepMessageIndex(msgs.value, request);
      return index >= 0 ? msgs.value[index] : null;
    }

    async function applyFocusRequest() {
      const request = pendingFocus.value;
      if (!request || (!request.ids?.length && !request.subject)) return;
      if (request.sessionKey && request.sessionKey !== activeKey.value) return;
      const target = messageForStep(request);
      if (!target) return;
      pendingFocus.value = null;
      await nextTick();
      // 等 MessageScroller 在历史加载后的自动滚底结束，再定位到目标消息。
      setTimeout(() => {
        const el = rootEl.value?.querySelector(`[data-msg-id="${target.id}"]`);
        if (!el) return;
        // 即时滚动：平滑滚动在部分环境中会被 MessageScroller 的自动滚底打断。
        el.scrollIntoView({ block: 'center', behavior: 'auto' });
        flashMessage(el);
      }, 120);
    }

    watch(
      () => props.focusRequest,
      (request) => {
        if (!request) {
          pendingFocus.value = null;
          return;
        }
        pendingFocus.value = request;
        nextTick(applyFocusRequest);
      },
    );

    // 会话切换 / 历史加载完成后重试定位。
    watch(msgs, () => {
      if (pendingFocus.value) applyFocusRequest();
    });

    function agentName(id) {
      return agentDisplayName(props.agents, id);
    }

    function handleSend(blocks) {
      return send(blocks);
    }

    function handleUserConfirm({ toolCall, confirm, replyId, rules }) {
      return onUserConfirm(toolCall, confirm, replyId, rules);
    }

    function handleSubagentConfirm({ entry, toolCall, confirm, rules }) {
      return onSubagentConfirm(entry, toolCall, confirm, rules);
    }

    function handleAskUserSubmit(toolCall, replyId, answers) {
      return onAskUserSubmit(toolCall, replyId, answers);
    }

    function handleSubagentAskUserSubmit(entry, toolCall, answers) {
      return onSubagentAskUserSubmit(entry, toolCall, answers);
    }

    onUnmounted(() => {
      abort();
      audioManager?.disposeAll();
    });

    return {
      rootEl,
      activeKey,
      activeEntry,
      agentId,
      sessionId,
      hasActiveSession,
      msgs,
      connection,
      loading,
      phase,
      error,
      subagentHitl,
      agentName,
      handleSend,
      handleUserConfirm,
      handleSubagentConfirm,
      handleAskUserSubmit,
      handleSubagentAskUserSubmit,
      interrupt,
      noop,
    };
  },
});
</script>

<style lang="less">
@keyframes sop-message-flash {
  0%,
  100% {
    background-color: transparent;
  }

  15%,
  55% {
    background-color: rgba(170, 59, 255, 0.16);
  }

  35%,
  75% {
    background-color: transparent;
  }
}

[data-sop-flash] {
  border-radius: 12px;
  animation: sop-message-flash 1.4s ease-out;
}

@media print {
  [data-sop-flash] {
    background-color: transparent !important;
    animation: none !important;
  }
}
</style>
