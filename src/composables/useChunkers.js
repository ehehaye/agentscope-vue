import { ref, onMounted } from '@/composables/vue';
import { knowledgeBaseApi } from '@/api';

/**
 * 获取 chunker 类型列表。
 * @returns {{ chunkers: Ref<any[]>, loading: Ref<boolean>, refetch: () => Promise<void> }}
 */
export function useChunkers() {
  const chunkers = ref([]);
  const loading = ref(false);

  async function refetch() {
    loading.value = true;
    try {
      const res = await knowledgeBaseApi.listChunkers();
      chunkers.value = res.chunkers || [];
    } catch {
      // 后端不支持时静默失败
    } finally {
      loading.value = false;
    }
  }

  onMounted(() => {
    refetch();
  });

  return { chunkers, loading, refetch };
}
