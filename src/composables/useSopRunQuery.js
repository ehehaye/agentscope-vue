import { ref, reactive, computed, watch, unref } from '@/composables/vue';
import { filterRuns, getPageCount, slicePage, sortRuns } from '@/views/sop/sop-utils';

const EMPTY_FILTERS = { title: '', status: '', date: '' };

/**
 * 运行记录的查询封装：过滤、排序、分页都在这里完成，UI 只需给出查询条件。
 * 结构上模拟后端接口（条件 + 页码 → 当前页数据 + 总数），因此后续换成服务端分页时不用改 UI。
 * filters 是草稿条件，调用 query() 才生效；resetFilters() 清空条件并重新查询。
 */
export function useSopRunQuery(
  runs,
  { pageSize: initialPageSize = 10, initialPage = 1, initialFilters = {}, initialSort = {} } = {},
) {
  const page = ref(Math.max(1, initialPage));
  const pageSize = ref(initialPageSize);
  const normalizedFilters = { ...EMPTY_FILTERS, ...(initialFilters || {}) };
  const filters = reactive({ ...normalizedFilters });
  const appliedFilters = reactive({ ...normalizedFilters });
  const sort = reactive({
    prop: initialSort?.prop === 'phase' ? 'phase' : 'created_at',
    order: initialSort?.order === 'ascending' ? 'ascending' : 'descending',
  });
  const rows = ref([]);
  const total = ref(0);
  const pageCount = computed(() => getPageCount(total.value, pageSize.value));

  function apply() {
    const source = unref(runs) || [];
    const filtered = filterRuns(source, appliedFilters);
    const sorted = sortRuns(filtered, sort);
    total.value = sorted.length;
    if (page.value > pageCount.value) page.value = pageCount.value;
    rows.value = slicePage(sorted, page.value, pageSize.value);
  }

  watch(() => unref(runs), apply, { immediate: true });

  watch(sort, () => {
    if (page.value !== 1) page.value = 1;
    apply();
  });

  watch(page, apply);

  function query() {
    appliedFilters.title = filters.title;
    appliedFilters.status = filters.status;
    appliedFilters.date = filters.date;
    if (page.value !== 1) page.value = 1;
    apply();
  }

  function resetFilters() {
    Object.assign(filters, EMPTY_FILTERS);
    Object.assign(appliedFilters, EMPTY_FILTERS);
    if (page.value !== 1) page.value = 1;
    apply();
  }

  function setPage(value) {
    page.value = value;
  }

  function setPageSize(value) {
    pageSize.value = value;
    if (page.value !== 1) page.value = 1;
    apply();
  }

  function setSort({ prop, order } = {}) {
    if (!order) {
      // 取消排序时回到默认：按创建时间倒序。
      sort.prop = 'created_at';
      sort.order = 'descending';
      return;
    }
    sort.prop = prop === 'phase' ? 'phase' : 'created_at';
    sort.order = order;
  }

  /** 用外部状态（例如路由 query）整体覆盖查询条件。 */
  function applyState({ filters: nextFilters, sort: nextSort, page: nextPage, pageSize: nextPageSize } = {}) {
    if (nextFilters) {
      const value = { ...EMPTY_FILTERS, ...nextFilters };
      Object.assign(filters, value);
      Object.assign(appliedFilters, value);
    }
    if (nextSort) {
      sort.prop = nextSort.prop === 'phase' ? 'phase' : 'created_at';
      sort.order = nextSort.order === 'ascending' ? 'ascending' : 'descending';
    }
    if (nextPageSize) pageSize.value = nextPageSize;
    if (nextPage) page.value = Math.max(1, nextPage);
    apply();
  }

  return {
    rows,
    total,
    page,
    pageSize,
    pageCount,
    filters,
    appliedFilters,
    sort,
    query,
    resetFilters,
    setPage,
    setPageSize,
    setSort,
    applyState,
  };
}
