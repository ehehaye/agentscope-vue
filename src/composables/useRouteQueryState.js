import _ from 'lodash';
import { watch } from '@/composables/vue';
import { useRoute, useRouter } from '@/composables/vue-router';

/**
 * 查询条件 ↔ 路由 query 双向同步。
 *
 * state 是扁平的查询条件对象，字段名即 query 参数名；defaults 声明各字段的默认值与类型：
 * - 等于默认值、空串或 null 的字段不写入 URL；
 * - 读回时按默认值的类型转换（number / boolean / string）。
 * 需要改名字段或做业务校验时，可用 parse / build 覆盖默认的解析与序列化。
 */
export function useRouteQueryState(state, { defaults = {}, parse, build } = {}) {
  const route = useRoute();
  const router = useRouter();

  function toQuery() {
    if (build) return build(state);
    const entries = _.pickBy(state, (value, key) => !_.isNil(value) && value !== '' && value !== defaults[key]);
    return _.mapValues(entries, String);
  }

  function fromQuery(query) {
    if (parse) return parse(query);
    return _.mapValues(defaults, (fallback, key) => {
      // 同名参数可能是数组（?key=1&key=2），取最后一个。
      const raw = _.last(_.castArray(query[key]));
      if (_.isNil(raw) || raw === '') return fallback;
      if (typeof fallback === 'number') {
        const number = Number(raw);
        return Number.isFinite(number) ? number : fallback;
      }
      if (typeof fallback === 'boolean') return raw === 'true';
      return raw;
    });
  }

  // 条件变化 → 写入 URL；与当前 query 相同则跳过。
  watch(
    () => state,
    () => {
      const next = toQuery();
      if (_.isEqual(route.query, next)) return;
      router.replace({ query: next });
    },
    { deep: true },
  );

  // URL 变化（前进/后退、手动改地址栏）→ 覆盖条件；自己写回的 query 跳过。
  watch(
    () => route.query,
    (query) => {
      if (_.isEqual(query, toQuery())) return;
      Object.assign(state, fromQuery(query));
    },
  );
}
