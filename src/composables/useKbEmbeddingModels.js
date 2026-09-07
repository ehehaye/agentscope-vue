import { ref, onMounted, watch } from '@/composables/vue';
import { knowledgeBaseApi } from '@/api';

/**
 * KB 创建时可用的嵌入模型列表。
 * @returns {{ providers: Ref<any[]>, policy: Ref<any|null>, loading: Ref<boolean>, error: Ref<Error|null>, refetch: () => Promise<void> }}
 */
export function useKbEmbeddingModels(refetchTrigger = ref(0)) {
  const providers = ref([]);
  const policy = ref(null);
  const loading = ref(false);
  const error = ref(null);

  async function refetch() {
    loading.value = true;
    error.value = null;
    try {
      const res = await knowledgeBaseApi.listEmbeddingModels();
      providers.value = res.providers || [];
      policy.value = res.policy || null;
    } catch (e) {
      error.value = e;
    } finally {
      loading.value = false;
    }
  }

  onMounted(() => {
    refetch();
  });

  watch(refetchTrigger, () => {
    refetch();
  });

  return { providers, policy, loading, error, refetch };
}
