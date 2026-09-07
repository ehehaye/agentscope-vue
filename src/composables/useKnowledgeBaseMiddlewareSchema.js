/**
 * 知识库中间件参数 schema（迁移自 useKnowledgeBaseMiddlewareSchema.ts）。
 * 模块级缓存：schema 在进程生命周期内不变。
 */
import { ref, onMounted } from '@/composables/vue';
import { knowledgeBaseApi } from '@/api';

let cached = null;
let inflight = null;

async function fetchSchema() {
  if (cached) return cached;
  if (inflight) return inflight;
  inflight = knowledgeBaseApi
    .middlewareParametersSchema()
    .then((res) => {
      cached = res;
      return res;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export function useKnowledgeBaseMiddlewareSchema() {
  const schema = ref(cached);
  const loading = ref(cached === null);
  const error = ref(null);
  let cancelled = false;

  onMounted(() => {
    if (cached) {
      loading.value = false;
      return;
    }
    fetchSchema()
      .then((res) => {
        if (cancelled) return;
        schema.value = res;
      })
      .catch((e) => {
        if (cancelled) return;
        error.value = e;
      })
      .finally(() => {
        if (!cancelled) loading.value = false;
      });
  });

  return { schema, loading, error };
}
