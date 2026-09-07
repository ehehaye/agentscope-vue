import { ref, onMounted } from '@/composables/vue';
import { skillApi } from '@/api';

/**
 * 用户已安装的技能列表。
 * @returns {{ skills: Ref<any[]>, loading: Ref<boolean>, error: Ref<Error|null>, refetch: () => Promise<any[]>, remove: (id: string) => Promise<void> }}
 */
export function useSkills() {
  const skills = ref([]);
  const loading = ref(false);
  const error = ref(null);
  let reqId = 0;

  async function refetch() {
    const id = ++reqId;
    loading.value = true;
    error.value = null;
    try {
      const res = await skillApi.list();
      const list = Array.isArray(res) ? res : res?.skills ?? [];
      if (id === reqId) skills.value = list;
      return list;
    } catch (e) {
      if (id === reqId) error.value = e;
      return [];
    } finally {
      if (id === reqId) loading.value = false;
    }
  }

  async function remove(skillId) {
    await skillApi.remove(skillId);
    await refetch();
  }

  onMounted(() => {
    refetch();
  });

  return { skills, loading, error, refetch, remove };
}
