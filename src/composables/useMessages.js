/**
 * useMessages composable：对 Vuex chat 模块的薄封装。
 * 向组件层暴露消息列表/发送/HITL 确认/中断/关闭等 API。
 */
import { computed, watch, unref } from '@/composables/vue';
import { useStore } from '@/composables/vuex';

export function useMessages(agentId, sessionId, options = {}) {
  const store = useStore();
  const key = computed(() => {
    const aid = unref(agentId);
    const sid = unref(sessionId);
    return aid && sid ? `${aid}:${sid}` : null;
  });

  const ownsConversation = computed(() => key.value !== null && store.state.chat.currentKey === key.value);

  const msgs = computed(() => (ownsConversation.value ? store.state.chat.messages : []));
  const loading = computed(() => (ownsConversation.value ? store.state.chat.loading : false));
  const phase = computed(() => (ownsConversation.value ? store.state.chat.phase : 'idle'));
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

  return {
    msgs,
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
  };
}
