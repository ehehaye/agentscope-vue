import { ref } from '@/composables/vue';
import { agentApi } from '@/api';

/**
 * 助手表单背后的完整 `AgentData` JSON Schema。
 *
 * schema 由后端 Pydantic 模型派生，服务运行期间不会变化，因此做模块级缓存：
 * 只请求一次，之后的新建 / 编辑对话框直接复用。
 */
let cachedSchema = null;
let inflight = null;

export function useAgentSchema() {
  const schema = ref(cachedSchema);
  const loading = ref(!cachedSchema);
  const error = ref(null);

  async function load() {
    if (cachedSchema) {
      schema.value = cachedSchema;
      loading.value = false;
      return cachedSchema;
    }
    if (!inflight) {
      inflight = agentApi
        .getSchema()
        .then((res) => (res && res.schema ? res.schema : res))
        .finally(() => {
          inflight = null;
        });
    }
    loading.value = true;
    error.value = null;
    try {
      cachedSchema = await inflight;
      schema.value = cachedSchema;
    } catch (e) {
      error.value = e;
    } finally {
      loading.value = false;
    }
    return schema.value;
  }

  load();

  return { schema, loading, error, reload: load };
}
