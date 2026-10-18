import { ref, onMounted } from '@/composables/vue';
import { sopApi } from '@/api';

/**
 * SOP 流程列表 CRUD composable。
 * @returns {{ sops: import('vue').Ref<any[]>, loading: import('vue').Ref<boolean>, error: import('vue').Ref<Error|null>, refetch: () => Promise<any[]>, create: (data: any) => Promise<any>, update: (id: string, data: any) => Promise<any>, remove: (id: string) => Promise<void> }}
 */
export function useSops() {
  const sops = ref([]);
  const loading = ref(false);
  const error = ref(null);
  let reqId = 0;

  async function refetch() {
    const id = ++reqId;
    loading.value = true;
    error.value = null;
    try {
      const res = await sopApi.list();
      const list = Array.isArray(res) ? res : (res?.sops ?? []);
      if (id === reqId) sops.value = list;
      return list;
    } catch (e) {
      if (id === reqId) error.value = e;
      return [];
    } finally {
      if (id === reqId) loading.value = false;
    }
  }

  async function create(data) {
    const res = await sopApi.create(data);
    await refetch();
    return res;
  }

  async function update(sopId, data) {
    const res = await sopApi.update(sopId, data);
    await refetch();
    return res;
  }

  async function remove(sopId) {
    await sopApi.remove(sopId);
    await refetch();
  }

  onMounted(() => {
    refetch();
  });

  return { sops, loading, error, refetch, create, update, remove };
}
