import { ref, onMounted } from '@/composables/vue';
import { scheduleApi } from '@/api';

/**
 * Schedule 列表 CRUD composable。
 * @returns {{ schedules: Ref<any[]>, loading: Ref<boolean>, error: Ref<Error|null>, refetch: () => Promise<any[]>, create: (body: any) => Promise<any>, update: (id: string, body: any) => Promise<any>, remove: (id: string) => Promise<void> }}
 */
export function useSchedules() {
  const schedules = ref([]);
  const loading = ref(false);
  const error = ref(null);
  let reqId = 0;

  async function refetch() {
    const id = ++reqId;
    loading.value = true;
    error.value = null;
    try {
      const res = await scheduleApi.list();
      const list = res?.schedules ?? [];
      if (id === reqId) schedules.value = list;
      return list;
    } catch (e) {
      if (id === reqId) error.value = e;
      return [];
    } finally {
      if (id === reqId) loading.value = false;
    }
  }

  async function create(body) {
    const res = await scheduleApi.create(body);
    await refetch();
    return res;
  }

  async function update(scheduleId, body) {
    const res = await scheduleApi.update(scheduleId, body);
    await refetch();
    return res;
  }

  async function remove(scheduleId) {
    await scheduleApi.delete(scheduleId);
    await refetch();
  }

  onMounted(() => {
    refetch();
  });

  return { schedules, loading, error, refetch, create, update, remove };
}
