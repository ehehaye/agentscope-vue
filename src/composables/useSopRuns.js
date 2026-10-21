import { ref, watch, unref } from '@/composables/vue';
import { sopApi } from '@/api';
import { useSopRunQuery } from '@/composables/useSopRunQuery';

/**
 * 某个 SOP 流程下的运行列表：内部拉取全部运行，并按查询条件完成过滤、排序与分页，
 * 对 UI 暴露的接口与服务端分页一致（条件 + 页码 → 当前页数据 + 总数）。
 * @param {import('vue').Ref<string|null>|string|null} sopId
 * @param {{ filters?: object, sort?: object, page?: number, pageSize?: number }} [initialQuery]
 */
export function useSopRuns(sopId, initialQuery = {}) {
  const runs = ref([]);
  const loading = ref(false);
  const error = ref(null);
  let reqId = 0;

  const {
    rows,
    total,
    page,
    pageSize,
    pageCount,
    filters,
    sort,
    queryState,
    query,
    resetFilters,
    setPage,
    setPageSize,
    setSort,
  } = useSopRunQuery(runs, {
    pageSize: initialQuery.pageSize,
    initialPage: initialQuery.page,
    initialFilters: initialQuery.filters,
    initialSort: initialQuery.sort,
  });

  async function refetch() {
    const id = ++reqId;
    const sid = unref(sopId);
    if (!sid) {
      runs.value = [];
      return [];
    }
    loading.value = true;
    error.value = null;
    try {
      const res = await sopApi.listRuns({ sop_id: sid });
      const list = res?.runs ?? [];
      if (id === reqId) runs.value = list;
      return list;
    } catch (e) {
      if (id === reqId) error.value = e;
      return [];
    } finally {
      if (id === reqId) loading.value = false;
    }
  }

  watch(
    () => unref(sopId),
    () => refetch(),
    { immediate: true },
  );

  async function start(inputs) {
    const res = await sopApi.startRun(unref(sopId), inputs);
    await refetch();
    return res;
  }

  async function remove(runId) {
    await sopApi.removeRun(runId);
    await refetch();
  }

  return {
    runs,
    rows,
    total,
    page,
    pageSize,
    pageCount,
    filters,
    sort,
    queryState,
    loading,
    error,
    refetch,
    query,
    resetFilters,
    setPage,
    setPageSize,
    setSort,
    start,
    remove,
  };
}
