<template>
  <div class="flex h-full flex-col p-5">
    <div class="mb-4 flex items-center gap-3">
      <img v-if="hub?.icon_url" :src="hub.icon_url" class="h-8 w-8 rounded-md object-cover" />
      <div v-else class="flex h-8 w-8 items-center justify-center rounded-md bg-muted text-sm font-bold">
        {{ (hub?.display_name || hubId).slice(0, 1).toUpperCase() }}
      </div>
      <div>
        <div class="text-lg font-medium">{{ hub?.display_name || hubId }}</div>
        <div class="text-xs text-muted-foreground">{{ hub?.description }}</div>
      </div>
      <el-input v-model="query" :placeholder="TEXT.skill.searchPlaceholder" size="small" class="ml-auto w-48" />
    </div>

    <div class="flex-1 overflow-y-auto">
      <div v-if="loading" class="flex justify-center py-10">
        <Spinner class="h-6 w-6" />
      </div>
      <div v-else-if="error" class="flex flex-col items-center gap-2 py-10 text-center">
        <Icon icon="lucide:triangle-alert" class="h-8 w-8 text-muted-foreground" />
        <div class="text-sm font-medium">{{ TEXT.skill.loadFailedTitle }}</div>
        <p class="text-xs text-muted-foreground">{{ TEXT.skill.loadFailedDescription }}</p>
        <el-button size="small" @click="refetch">{{ TEXT.skill.retry }}</el-button>
      </div>
      <div v-else-if="cards.length === 0" class="flex flex-col items-center gap-2 py-10 text-center">
        <Icon icon="lucide:blocks" class="h-8 w-8 text-muted-foreground" />
        <div class="text-sm font-medium">{{ TEXT.skill.noCardsTitle }}</div>
        <p class="text-xs text-muted-foreground">{{ TEXT.skill.noCardsDescription }}</p>
      </div>
      <div v-else class="space-y-2">
        <div
          v-for="card in cards"
          :key="`${card.hub_id}:${card.id}`"
          class="group flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted"
          @click="openDetail(card)"
        >
          <img v-if="card.icon_url" :src="card.icon_url" class="h-10 w-10 rounded-md object-cover" />
          <div v-else class="flex h-10 w-10 items-center justify-center rounded-md bg-muted text-sm font-bold">
            {{ (card.display_name || card.name).slice(0, 1).toUpperCase() }}
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2">
              <span class="font-medium">{{ card.display_name || card.name }}</span>
              <span v-if="card.author" class="text-xs text-muted-foreground">@{{ card.author }}</span>
              <span v-for="tag in (card.tags || []).slice(0, 4)" :key="tag" class="rounded-full bg-secondary px-1.5 py-0.5 tw-text-10px">#{{ tag }}</span>
            </div>
            <p class="line-clamp-1 text-xs text-muted-foreground">{{ card.description }}</p>
          </div>
          <div class="flex items-center gap-2">
            <span v-if="card.downloads != null" class="inline-flex items-center gap-1 tw-text-10px text-muted-foreground">
              <Icon icon="lucide:download" class="h-3 w-3" />
              {{ card.downloads.toLocaleString() }}
            </span>
            <span v-if="card.updated_at" class="tw-text-10px text-muted-foreground">
              {{ now - card.updated_at < 3600 ? TEXT.skill.updatedRecently : TEXT.skill.updatedAgo(formatTime(now - card.updated_at, { leadingUnitOnly: true })) }}
            </span>
            <span v-if="installedNames.has(card.name)" class="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 tw-text-11px text-muted-foreground">
              <Icon icon="lucide:check" class="h-3 w-3" />
              {{ TEXT.skill.installed }}
            </span>
            <el-button v-else size="mini" :loading="installingId === card.id" @click.stop="handleInstall(card)">
              {{ TEXT.skill.install }}
            </el-button>
          </div>
        </div>
      </div>
      <div v-if="hasMore" class="mt-4 text-center">
        <el-button size="small" :loading="loadingMore" @click="loadMore">加载更多</el-button>
      </div>
    </div>

    <el-drawer
      :title="detailCard?.display_name || detailCard?.name || '详情'"
      :visible.sync="detailOpen"
      direction="rtl"
      size="30rem"
    >
      <div v-if="detailLoading" class="flex justify-center py-10">
        <Spinner class="h-6 w-6" />
      </div>
      <div v-else-if="detailCard" class="flex h-full flex-col gap-4 p-4">
        <p class="text-sm text-muted-foreground">{{ detailCard.description }}</p>
        <div v-if="detailCard.markdown" class="flex-1 overflow-y-auto">
          <MarkdownRenderer :content="detailCard.markdown" />
        </div>
        <div v-else class="text-xs text-muted-foreground">{{ TEXT.skill.noReadme }}</div>
      </div>
    </el-drawer>
  </div>
</template>

<script>
import { defineComponent, ref, computed } from '@/composables/vue';
import { Icon } from '@iconify/vue2';
import Spinner from '@/components/ui/Spinner.vue';
import MarkdownRenderer from '@/components/common/MarkdownRenderer.vue';
import { useSkillHubCards } from '@/composables/useSkillHubCards';
import { hubApi } from '@/api';
import { formatTime } from '@/utils/common';
import { TEXT } from './text';

export default defineComponent({
  name: 'SkillHubPanel',
  components: { Icon, Spinner, MarkdownRenderer },
  props: {
    hubId: { type: String, required: true },
    hub: { type: Object, default: null },
    installedNames: { type: Set, default: () => new Set() },
  },
  setup(props, { emit }) {
    const query = ref('');
    const hubIdRef = computed(() => props.hubId);
    const queryRef = computed(() => query.value);
    const { cards, loading, loadingMore, error, hasMore, loadMore, refetch } = useSkillHubCards(hubIdRef, queryRef);

    const now = Date.now() / 1000;

    const installingId = ref(null);

    async function handleInstall(card) {
      if (installingId.value) return;
      installingId.value = card.id;
      try {
        await hubApi.skill.install(card.hub_id, card.id);
        emit('installed');
      } finally {
        installingId.value = null;
      }
    }

    const detailOpen = ref(false);
    const detailCard = ref(null);
    const detailLoading = ref(false);

    async function openDetail(card) {
      detailCard.value = card;
      detailOpen.value = true;
      detailLoading.value = true;
      try {
        const res = await hubApi.skill.getCard(card.hub_id, card.id);
        detailCard.value = res;
      } catch {
        // keep list card
      } finally {
        detailLoading.value = false;
      }
    }

    return {
      query,
      cards,
      loading,
      loadingMore,
      error,
      hasMore,
      loadMore,
      refetch,
      now,
      installingId,
      handleInstall,
      detailOpen,
      detailCard,
      detailLoading,
      openDetail,
      formatTime,
      TEXT,
    };
  },
});
</script>
