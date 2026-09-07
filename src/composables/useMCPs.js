import { ref, onMounted } from '@/composables/vue';
import { mcpApi } from '@/api';

/**
 * 用户已安装的 MCP 列表。
 * @returns {{ mcps: Ref<any[]>, loading: Ref<boolean>, error: Ref<Error|null>, refetch: () => Promise<any[]>, remove: (id: string) => Promise<void> }}
 */
export function useMCPs() {
  const mcps = ref([]);
  const loading = ref(false);
  const error = ref(null);
  let reqId = 0;

  async function refetch() {
    const id = ++reqId;
    loading.value = true;
    error.value = null;
    try {
      const res = await mcpApi.list();
      const list = Array.isArray(res) ? res : res?.mcps ?? [];
      if (id === reqId) mcps.value = list;
      return list;
    } catch (e) {
      if (id === reqId) error.value = e;
      return [];
    } finally {
      if (id === reqId) loading.value = false;
    }
  }

  async function remove(mcpId) {
    await mcpApi.remove(mcpId);
    await refetch();
  }

  onMounted(() => {
    refetch();
  });

  return { mcps, loading, error, refetch, remove };
}
