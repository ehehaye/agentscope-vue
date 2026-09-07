/**
 * 上传中心封装（迁移方案 02 §4.5 / 03 Phase 5）。
 * upload 已落 Vuex L3，本 composable 是对 store 的薄封装，暴露与 React
 * useUploadContext 同名的 enqueue/cancel/dismiss/clearFinishedForKb/
 * tasksForKb/applyServerStatuses/pollableDocumentIds，调用点最小改动。
 */
import { computed } from '@/composables/vue';
import { useStore } from '@/composables/vuex';

export function useUploadCenter() {
  const store = useStore();

  function enqueue(knowledgeBaseId, files) {
    return store.dispatch('upload/enqueue', { knowledgeBaseId, files });
  }
  function cancel(taskId) {
    return store.dispatch('upload/cancel', taskId);
  }
  function dismiss(taskId) {
    return store.dispatch('upload/dismiss', taskId);
  }
  function clearFinishedForKb(knowledgeBaseId) {
    return store.dispatch('upload/clearFinishedForKb', knowledgeBaseId);
  }
  function applyServerStatuses(knowledgeBaseId, items) {
    return store.dispatch('upload/applyServerStatuses', { knowledgeBaseId, items });
  }
  function tasksForKb(knowledgeBaseId) {
    return store.getters['upload/tasksForKb'](knowledgeBaseId);
  }
  function pollableDocumentIds(knowledgeBaseId) {
    return store.getters['upload/pollableDocumentIds'](knowledgeBaseId);
  }

  const allTasks = computed(() => store.state.upload.tasks);
  const hasInFlight = computed(() => store.getters['upload/hasInFlight']);

  return {
    tasks: allTasks,
    hasInFlight,
    enqueue,
    cancel,
    dismiss,
    clearFinishedForKb,
    tasksForKb,
    applyServerStatuses,
    pollableDocumentIds,
  };
}
