import { ref, onMounted } from '@/composables/vue';
import { hubApi } from '@/api';

/**
 * Skill Hub 列表。
 * @returns {{ hubs: Ref<any[]>, loading: Ref<boolean>, error: Ref<Error|null>, refetch: () => Promise<any[]> }}
 */
export function useSkillHubs() {
  const hubs = ref([]);
  const loading = ref(false);
  const error = ref(null);
  let reqId = 0;

  async function refetch() {
    const id = ++reqId;
    loading.value = true;
    error.value = null;
    try {
      const res = await hubApi.skill.listHubs();
      const list = Array.isArray(res) ? res : res?.hubs ?? [];
      if (id === reqId) hubs.value = list;
      return list;
    } catch (e) {
      if (id === reqId) error.value = e;
      return [];
    } finally {
      if (id === reqId) loading.value = false;
    }
  }

  onMounted(() => {
    refetch();
  });

  return { hubs, loading, error, refetch };
}
