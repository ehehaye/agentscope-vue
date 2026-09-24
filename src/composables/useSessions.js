import { ref, watch, unref } from '@/composables/vue';
import { useStore } from '@/composables/vuex';
import { sessionApi } from '@/api';

/** 轮询间隔（毫秒），避免用户长时间等待状态变化。 */
const INTERVAL_MS = 100;

/** 默认超时时间（毫秒）。 */
const DEFAULT_TIMEOUT_MS = 30 * 1000;

/**
 * 等待指定会话的 SSE 连接建立。
 * 通过 setInterval 轮询 store 状态实现，超时后 reject。
 *
 * @param {string} aid Agent id。
 * @param {string} sid Session id。
 * @param {object} [options] 配置项。
 * @param {number} [options.timeoutMs=30000] 超时时间（毫秒）。
 * @param {number} [options.intervalMs=100] 轮询间隔（毫秒）。
 * @returns {Promise<void>} 连接就绪后 resolve；超时后 reject。
 */
export function waitForConversationReady(aid, sid, { timeoutMs = DEFAULT_TIMEOUT_MS, intervalMs = INTERVAL_MS } = {}) {
  const store = useStore();
  const targetKey = `${aid}:${sid}`;
  return new Promise((resolve, reject) => {
    const isReady = () =>
      store.state.chat.currentKey === targetKey && store.state.chat.streamConnected;
    if (isReady()) {
      resolve();
      return;
    }
    const start = Date.now();
    const timer = setInterval(() => {
      if (isReady()) {
        clearInterval(timer);
        resolve();
      } else if (Date.now() - start >= timeoutMs) {
        clearInterval(timer);
        reject(new Error(`等待会话 ${targetKey} 就绪超时（${timeoutMs}ms）`));
      }
    }, intervalMs);
  });
}

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

