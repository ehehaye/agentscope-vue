import { ref, watch, unref } from '@/composables/vue';
import { workspaceApi } from '@/api';

/**
 * 拉取会话工作区状态（cwd + git）。
 * @param {import('@vue/composition-api').Ref<string|null>|string|null} agentId
 * @param {import('@vue/composition-api').Ref<string|null>|string|null} sessionId
 * @param {import('@vue/composition-api').Ref<string|null>|string|null} cwd
 */
export function useWorkspaceStatus(agentId, sessionId, cwd) {
  const status = ref(null);
  const loading = ref(false);
  const error = ref(null);
  let reqId = 0;

  async function refetch() {
    const id = ++reqId;
    const aid = unref(agentId);
    const sid = unref(sessionId);
    if (!aid || !sid) {
      status.value = null;
      return null;
    }
    loading.value = true;
    error.value = null;
    try {
      const res = await workspaceApi.status(aid, sid);
      if (id === reqId) status.value = res;
      return res;
    } catch (e) {
      if (id === reqId) error.value = e;
      return null;
    } finally {
      if (id === reqId) loading.value = false;
    }
  }

  watch(
    () => [unref(agentId), unref(sessionId), unref(cwd)],
    () => refetch(),
    { immediate: true },
  );

  return { status, loading, error, refetch };
}
