import { reactive, watch, getCurrentInstance } from '@/composables/vue';

/**
 * 路由桥接（迁移方案 02 §5.1）。
 * Vue 2.6 + composition-api 中没有内置 useRoute/useRouter，
 * 通过 getCurrentInstance 从组件实例上取得。
 *
 * 注意：不能直接返回 `proxy.$route`，那只是 setup 时刻的快照——
 * vue-router 在导航时会把 `proxy.$route` 替换成新对象，快照会过期，
 * 导致基于它的 computed/watch 永远不更新。
 * 这里返回一个响应式副本，并在 `proxy.$route` 变化时同步字段，
 * 调用方可以像 Vue 3 一样直接写 `route.query.xxx` / `route.params.xxx`。
 */
export function useRoute() {
  const instance = getCurrentInstance();
  const proxy = instance?.proxy;

  const route = reactive({
    params: {},
    query: {},
    path: '/',
    name: undefined,
    fullPath: '/',
    hash: '',
    matched: [],
    meta: {},
    redirectedFrom: undefined,
  });

  if (!proxy) return route;

  const sync = (next) => {
    if (!next) return;
    // query/params 整体替换以触发响应式；其余字段直接覆盖
    Object.assign(route, next);
  };

  watch(
    () => proxy.$route,
    (next) => sync(next),
    { immediate: true },
  );

  return route;
}

export function useRouter() {
  const instance = getCurrentInstance();
  return instance?.proxy?.$router;
}
