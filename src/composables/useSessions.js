import { ref, watch, unref } from '@/composables/vue';
import { useStore } from '@/composables/vuex';
import { sessionApi } from '@/api';

/**
 * 拉取某个 agent 下的会话列表（含团队信息）。
 *
 * 会话创建相关的方法会顺带驱动 chat 模块里本应用自定义的状态：
 * `chat/startCreating`、`chat/endCreating`（AppConnectionState.CREATING 的进出）
 * 与 `chat/stageInput`（新建会话首发的暂存消息）。SDK 不参与这些状态。
 *
 * @param {import('vue').Ref<string|null>|string|null} agentId
 */
export function useSessions(agentId) {
  const store = useStore();
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
    // 创建期间路由尚未切换，chat 模块无从感知，需显式标记为 preparing
    await store.dispatch('chat/startCreating');
    try {
      const res = await sessionApi.create(body);
      await refetch();
      return res;
    } finally {
      await store.dispatch('chat/endCreating');
    }
  }

  /**
   * 创建会话并把首条消息暂存到 chat 模块，待新会话 SSE 就绪后由其自动补发。
   * 视图只需接着跳转到该会话，不用自己等待时序。
   *
   * @param {object} body 会话创建参数。
   * @param {object[]} content 首条消息的内容块。
   * @returns {Promise<string>} 新会话 id。
   */
  async function createWithInput(body, content) {
    const res = await create(body);
    const sessionId = res.session_id;
    await store.dispatch('chat/stageInput', {
      agentId: unref(agentId),
      sessionId,
      content,
    });
    return sessionId;
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

  return { sessions, loading, error, refetch, create, createWithInput, update, remove };
}
