import { reactive, computed, unref } from '@/composables/vue';
import { isValid, format } from 'date-fns';

const EMPTY_FILTERS = { date: '' };

/** 会话创建时间的本地日期键（yyyy-MM-dd），无效时返回 'unknown'。 */
export function sessionDateKey(view) {
  const raw = view?.session?.created_at;
  const date = raw ? new Date(raw) : null;
  return date && isValid(date) ? format(date, 'yyyy-MM-dd') : 'unknown';
}

/**
 * 会话列表的查询封装：按创建日期过滤。
 *
 * 与 useSopRunQuery 不同，会话侧日期选择即生效（没有「查询」按钮），
 * 因此省去草稿 / 已生效条件（filters / queryState）的分离，filters 一变就重新过滤。
 * 分组、空状态等展示逻辑留在 SessionList，这里只产出过滤后的会话。
 *
 * @param {Function|import('vue').Ref|any[]} sessionsSource
 *   会话列表来源。注意：组件里的 props 数组不是响应式源，直接传数组只会拿到挂载时的快照，
 *   列表后续更新后 rows 不会重算。请传 getter（`() => props.sessions`）或 ref。
 * @returns {{ rows: import('vue').ComputedRef<any[]>, filters: { date: string } }}
 */
export function useSessionsQuery(sessionsSource) {
  const filters = reactive({ ...EMPTY_FILTERS });

  // 用 computed 把来源解析成响应式的列表；getter / ref 在这里都能正确追踪。
  const source = computed(() => (typeof sessionsSource === 'function' ? sessionsSource() : unref(sessionsSource)));

  const rows = computed(() => {
    const list = source.value || [];
    return filters.date ? list.filter((v) => sessionDateKey(v) === filters.date) : list;
  });

  return { rows, filters };
}
