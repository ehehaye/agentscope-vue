/**
 * 上传中心封装：对 Vuex upload 模块的薄封装。
 * 暴露 enqueue/cancel/dismiss/clearFinishedForKb/
 * tasksForKb/applyServerStatuses/pollableDocumentIds。
 */
import { computed } from '@/composables/vue';
import store from '@/store';

export function useUploadCenter() {
  async function enqueue(payload) {
    return store.dispatch('upload/enqueue', payload);
  }
  async function cancel(taskId) {
    return store.dispatch('upload/cancel', taskId);
  }
  async function dismiss(taskId) {
    return store.dispatch('upload/dismiss', taskId);
  }
  async function clearFinishedForKb(knowledgeBaseId) {
    return store.dispatch('upload/clearFinishedForKb', knowledgeBaseId);
  }
  async function applyServerStatuses(payload) {
    return store.dispatch('upload/applyServerStatuses', payload);
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
