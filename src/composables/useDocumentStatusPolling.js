/**
 * 文档状态轮询。
 * 条件轮询：仅当存在非终态文档 id 时调度请求；每 tick 返回的 items
 * fan-out 到 upload 模块的 applyServerStatuses，联动上传卡片显示服务端进度。
 */
import { ref, watch, onUnmounted, unref } from '@/composables/vue';
import { knowledgeBaseApi } from '@/api';
import { useUploadCenter } from './useUploadCenter.js';

const POLL_INTERVAL_MS = 1500;

export function useDocumentStatusPolling({ knowledgeBaseId, documents }) {
  const { pollableDocumentIds, applyServerStatuses } = useUploadCenter();
  const statuses = ref({});
  const polling = ref(false);
  let timer = null;
  let inflight = null;
  let cancelled = false;

  // 服务端列表中的非终态文档 id（捕获刷新后的残留轮询）
  function serverNonTerminalIds() {
    const out = [];
    for (const d of documents.value || []) {
      if (d.status !== 'ready' && d.status !== 'error') out.push(d.id);
    }
    return out;
  }

  // 排序并集 key：单 id 增删恰好触发一次 effect 重跑
  function watchIdsKey() {
    const set = new Set(serverNonTerminalIds());
    const kbId = typeof knowledgeBaseId === 'string' ? knowledgeBaseId : knowledgeBaseId?.value;
    if (kbId) {
      for (const id of pollableDocumentIds(kbId)) set.add(id);
    }
    return Array.from(set).sort().join(',');
  }

  async function tick() {
    if (cancelled) return;
    const kbId = typeof knowledgeBaseId === 'string' ? knowledgeBaseId : knowledgeBaseId?.value;
    if (!kbId) return;
    const ids = watchIdsKey() ? watchIdsKey().split(',') : [];
    if (ids.length === 0) return;
    if (inflight) inflight.abort();
    const controller = new AbortController();
    inflight = controller;
    try {
      const { items } = await knowledgeBaseApi.getDocumentStatus(kbId, ids);
      if (cancelled) return;
      const next = { ...statuses.value };
      for (const item of items) next[item.id] = item;
      statuses.value = next;
      applyServerStatuses(
        kbId,
        items.map((i) => ({ id: i.id, status: i.status, error: i.error })),
      );
    } catch {
      // 吞掉瞬时错误，下一 tick 重试
    }
  }

  watch(
    () => [unref(knowledgeBaseId), watchIdsKey()],
    ([kbId, key]) => {
      polling.value = key.length > 0;
      if (!kbId || !key) return;
      cancelled = false;
      // 立即首读（上传刚结束时不等整间隔）
      void tick();
      if (timer) clearInterval(timer);
      timer = setInterval(() => void tick(), POLL_INTERVAL_MS);
    },
    { immediate: true },
  );

  onUnmounted(() => {
    cancelled = true;
    if (inflight) inflight.abort();
    if (timer) clearInterval(timer);
  });

  return { statuses, polling };
}
