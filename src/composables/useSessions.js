import { ref, watch, unref } from '@/composables/vue';
import { sessionApi } from '@/api';

/**
 * 拉取某个 agent 下的会话列表（含团队信息）。
 * @param {import('vue').Ref<string|null>|string|null} agentId
 */
export function useSessions(agentId) {
  const sessions = ref([]);
  const loading = ref(false);
  const error = ref(null);
  let reqId = 0;

  async function refetch() {
    const id = ++reqId;
    const aid = unref(agentId);
    if (!aid) {
      sessions.value = [];
      return [];
    }
    loading.value = true;
    error.value = null;
    try {
      const res = await sessionApi.list(aid);
      const list = res?.sessions ?? res ?? [];
      if (id === reqId) sessions.value = list;
      return list;
    } catch (e) {
      if (id === reqId) error.value = e;
      return [];
    } finally {
      if (id === reqId) loading.value = false;
    }
  }

  watch(
    () => unref(agentId),
    () => refetch(),
    { immediate: true },
  );

  async function create(body) {
    const res = await sessionApi.create(body);
    await refetch();
    return res;
  }

  async function update(sid, aid, body, options) {
    const res = await sessionApi.update(sid, aid, body, options);
    await refetch();
    return res;
  }

  async function remove(sid, aid) {
    await sessionApi.delete(sid, aid);
    await refetch();
  }

  return { sessions, loading, error, refetch, create, update, remove };
}

