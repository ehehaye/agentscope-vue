import { ref, watch, unref } from '@/composables/vue';
import { sopApi } from '@/api';

/**
 * 某个 SOP 流程下的运行列表。
 * @param {import('vue').Ref<string|null>|string|null} sopId
 * @returns {{ runs: import('vue').Ref<any[]>, loading: import('vue').Ref<boolean>, error: import('vue').Ref<Error|null>, refetch: () => Promise<any[]>, start: (inputs: any[]) => Promise<any>, remove: (runId: string) => Promise<void> }}
 */
export function useSopRuns(sopId) {
  const runs = ref([]);
  const loading = ref(false);
  const error = ref(null);
  let reqId = 0;

  async function refetch() {
    const id = ++reqId;
    const sid = unref(sopId);
    if (!sid) {
      runs.value = [];
      return [];
    }
    loading.value = true;
    error.value = null;
    try {
      const res = await sopApi.listRuns({ sop_id: sid });
      const list = res?.runs ?? [];
      if (id === reqId) runs.value = list;
      return list;
    } catch (e) {
      if (id === reqId) error.value = e;
      return [];
    } finally {
      if (id === reqId) loading.value = false;
    }
  }

  watch(
    () => unref(sopId),
    () => refetch(),
    { immediate: true },
  );

  async function start(inputs) {
    const res = await sopApi.startRun(unref(sopId), inputs);
    await refetch();
    return res;
  }

  async function remove(runId) {
    await sopApi.removeRun(runId);
    await refetch();
  }

  return { runs, loading, error, refetch, start, remove };
}
