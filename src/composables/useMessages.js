/**
 * useMessages composable：对 Vuex chat 模块的薄封装。
 * 向组件层暴露消息列表/发送/HITL 确认/中断/关闭等 API。
 *
 * 注意区分：`msgs` 的元素是 SDK 的 `Msg`，`phase` / `connection` 则是本应用自定义状态
 * （AppReplyPhase / AppConnectionState），SDK 没有这两个概念。
 */
import { computed, watch, unref } from '@/composables/vue';
import { useStore } from '@/composables/vuex';
import { AppConnectionState, AppReplyPhase } from '@/constants/app-state';

export function useMessages(agentId, sessionId, options = {}) {
  const store = useStore();
  const key = computed(() => {
    const aid = unref(agentId);
    const sid = unref(sessionId);
    return aid && sid ? `${aid}:${sid}` : null;
  });

  const ownsConversation = computed(() => key.value !== null && store.state.chat.currentKey === key.value);

  const msgs = computed(() => (ownsConversation.value ? store.state.chat.messages : []));
  // 以下三个计算属性都取自 chat 模块的本应用自定义状态（AppConnectionState / AppReplyPhase），
  // SDK 事件本身不携带「连接状态」或「相位」。
  // 创建/拉历史/建连期间都视为加载中，避免中间窗口露出空态；
  // 创建会话时还没有 key，无法用 ownsConversation 判定归属，故按 key 为空放行。
  const connection = computed(() =>
    ownsConversation.value || key.value === null ? store.state.chat.connection : AppConnectionState.IDLE,
  );
  const loading = computed(() => (ownsConversation.value || key.value === null) && store.getters['chat/preparing']);
  const phase = computed(() => (ownsConversation.value ? store.state.chat.phase : AppReplyPhase.IDLE));
  const error = computed(() => (ownsConversation.value ? store.state.chat.error : null));
  const subagentHitl = computed(() => (ownsConversation.value ? store.state.chat.subagentHitl : []));

  watch(
    key,
    (newKey, oldKey) => {
      if (newKey === oldKey) return;
      store.dispatch('chat/openConversation', {
        agentId: unref(agentId),
        sessionId: unref(sessionId),
        callbacks: options,
      });
    },
    { immediate: true },
  );

  async function send(contentBlocks) {
    return store.dispatch('chat/send', contentBlocks);
  }

  async function onUserConfirm(toolCall, confirm, replyId, rules) {
    return store.dispatch('chat/confirm', { toolCall, confirm, rules });
  }

  async function onSubagentConfirm(entry, toolCall, confirm, rules) {
    return store.dispatch('chat/subagentConfirm', { entry, toolCall, confirm, rules });
  }

  async function onAskUserSubmit(toolCall, replyId, answers) {
    return store.dispatch('chat/askUserSubmit', { toolCall, replyId, answers });
  }

  async function onSubagentAskUserSubmit(entry, toolCall, answers) {
    return store.dispatch('chat/subagentAskUserSubmit', { entry, toolCall, answers });
  }

  async function interrupt() {
    return store.dispatch('chat/interrupt');
  }

  async function abort() {
    return store.dispatch('chat/closeConversation');
  }

  /**
   * 丢弃新建会话暂存的首条消息（跳转失败时调用）。
   * @returns {Promise<boolean>} 是否确实丢弃了暂存消息。
   */
  function discardPendingInput() {
    return store.dispatch('chat/discardPendingInput');
  }

  return {
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
    discardPendingInput,
  };
}
