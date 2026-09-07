import { ref, watch } from '@/composables/vue';
import { hubApi } from '@/api';

const LIMIT = 20;

/**
 * 指定 Skill Hub 的卡片分页浏览。
 * @param hubIdRef
 * @param queryRef
 */
export function useSkillHubCards(hubIdRef, queryRef) {
  const cards = ref([]);
  const loading = ref(false);
  const loadingMore = ref(false);
  const error = ref(null);
  const hasMore = ref(false);
  const cursor = ref(null);

  async function fetchPage(append) {
    const hubId = hubIdRef.value;
    if (!hubId) return;
    const isLoadMore = append && cursor.value;
    if (isLoadMore) loadingMore.value = true;
    else loading.value = true;
    error.value = null;
    try {
      const res = await hubApi.skill.listCards(hubId, {
        q: queryRef.value,
        cursor: isLoadMore ? cursor.value : undefined,
        limit: LIMIT,
      });
      const list = res.cards || [];
      if (isLoadMore) cards.value.push(...list);
      else cards.value = list;
      cursor.value = res.next_cursor || null;
      hasMore.value = !!res.next_cursor;
    } catch (e) {
      error.value = e;
      if (!isLoadMore) cards.value = [];
    } finally {
      if (isLoadMore) loadingMore.value = false;
      else loading.value = false;
    }
  }

  async function refetch() {
    cursor.value = null;
    await fetchPage(false);
  }

  async function loadMore() {
    if (!hasMore.value || loadingMore.value) return;
    await fetchPage(true);
  }

  watch([hubIdRef, queryRef], () => {
    cursor.value = null;
    fetchPage(false);
  }, { immediate: true });

  return { cards, loading, loadingMore, error, hasMore, loadMore, refetch };
}
