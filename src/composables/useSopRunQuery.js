import { ref, reactive, computed, watch, unref } from '@/composables/vue';
import { filterRuns, getPageCount, slicePage, sortRuns } from '@/views/sop/sop-utils';

const EMPTY_FILTERS = { title: '', status: '', date: '' };

/**
 * 运行记录的查询封装：过滤、排序、分页都在这里完成，UI 只需给出查询条件。
 * 已生效的条件收敛在扁平的 queryState 中（字段名与路由 query 一致），
 * 可直接交给 useRouteQueryState 与 URL 双向同步。
 * filters 是草稿条件，调用 query() 才写回 queryState。
 */
export function useSopRunQuery(
  runs,
  { pageSize: initialPageSize = 10, initialPage = 1, initialFilters = {}, initialSort = {} } = {},
) {
  const queryState = reactive({
    title: initialFilters.title || '',
    status: initialFilters.status || '',
    date: initialFilters.date || '',
    sort: initialSort?.prop === 'phase' ? 'phase' : 'created_at',
    order: initialSort?.order === 'ascending' ? 'ascending' : 'descending',
    page: Math.max(1, initialPage),
    page_size: initialPageSize,
  });

  const filters = reactive({
    title: queryState.title,
    status: queryState.status,
    date: queryState.date,
  });

  // page / pageSize / sort 是对 queryState 的视图，模板与旧调用方式保持不变。
  const page = computed({
    get: () => queryState.page,
    set: (value) => {
      queryState.page = value;
    },
  });
  const pageSize = computed({
    get: () => queryState.page_size,
    set: (value) => {
      queryState.page_size = value;
    },
  });
  const sort = computed(() => ({ prop: queryState.sort, order: queryState.order }));

  const rows = ref([]);
  const total = ref(0);
  const pageCount = computed(() => getPageCount(total.value, pageSize.value));

  function apply() {
    const source = unref(runs) || [];
    const filtered = filterRuns(source, queryState);
    const sorted = sortRuns(filtered, sort.value);
    total.value = sorted.length;
    if (queryState.page > pageCount.value) queryState.page = pageCount.value;
    rows.value = slicePage(sorted, queryState.page, queryState.page_size);
  }

  watch(() => unref(runs), apply, { immediate: true });

  watch(sort, () => {
    if (queryState.page !== 1) queryState.page = 1;
    apply();
  });

  watch(page, apply);

  // queryState 被外部（路由还原）改动时重新计算结果。
  watch(() => [queryState.title, queryState.status, queryState.date, queryState.page_size], apply);

  // 生效条件变化时同步回草稿，返回列表页时筛选框与 URL 一致。
  watch(
    () => [queryState.title, queryState.status, queryState.date],
    ([title, status, date]) => {
      filters.title = title;
      filters.status = status;
      filters.date = date;
    },
  );

  function query() {
    queryState.title = (filters.title || '').trim();
    queryState.status = filters.status;
    queryState.date = filters.date;
    if (queryState.page !== 1) queryState.page = 1;
  }

  function resetFilters() {
    Object.assign(filters, EMPTY_FILTERS);
    Object.assign(queryState, EMPTY_FILTERS);
    if (queryState.page !== 1) queryState.page = 1;
  }

  function setPage(value) {
    queryState.page = value;
  }

  function setPageSize(value) {
    queryState.page_size = value;
    if (queryState.page !== 1) queryState.page = 1;
  }

  function setSort({ prop, order } = {}) {
    if (!order) {
      // 取消排序时回到默认：按创建时间倒序。
      queryState.sort = 'created_at';
      queryState.order = 'descending';
      return;
    }
    queryState.sort = prop === 'phase' ? 'phase' : 'created_at';
    queryState.order = order;
  }

  return {
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
  };
}
