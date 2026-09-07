<template>
  <div class="tw-flex tw-h-full tw-flex-col tw-p-5">
    <div class="tw-mb-4 tw-flex tw-items-center tw-gap-3">
      <img v-if="hub?.icon_url" :src="hub.icon_url" class="tw-h-8 tw-w-8 tw-rounded-md tw-object-cover" />
      <div v-else class="tw-flex tw-h-8 tw-w-8 tw-items-center tw-justify-center tw-rounded-md tw-bg-muted tw-text-sm tw-font-bold">
        {{ (hub?.display_name || hubId).slice(0, 1).toUpperCase() }}
      </div>
      <div>
        <div class="tw-text-lg tw-font-medium">{{ hub?.display_name || hubId }}</div>
        <div class="tw-text-xs tw-text-muted-foreground">{{ hub?.description }}</div>
      </div>
      <el-input v-model="query" placeholder="搜索" size="small" class="tw-ml-auto tw-w-48" />
    </div>

    <div class="tw-flex-1 tw-overflow-y-auto">
      <div v-if="loading" class="tw-flex tw-justify-center tw-py-10">
        <Spinner class="tw-h-6 tw-w-6" />
      </div>
      <div v-else-if="error" class="tw-flex tw-flex-col tw-items-center tw-gap-2 tw-py-10 tw-text-center">
        <Icon icon="lucide:triangle-alert" class="tw-h-8 tw-w-8 tw-text-muted-foreground" />
        <div class="tw-text-sm tw-font-medium">{{ TEXT.mcp.loadFailedTitle }}</div>
        <p class="tw-text-xs tw-text-muted-foreground">{{ TEXT.mcp.loadFailedDescription }}</p>
        <el-button size="small" @click="refetch">{{ TEXT.mcp.retry }}</el-button>
      </div>
      <div v-else-if="cards.length === 0" class="tw-flex tw-flex-col tw-items-center tw-gap-2 tw-py-10 tw-text-center">
        <Icon icon="lucide:blocks" class="tw-h-8 tw-w-8 tw-text-muted-foreground" />
        <div class="tw-text-sm tw-font-medium">{{ TEXT.mcp.noCardsTitle }}</div>
        <p class="tw-text-xs tw-text-muted-foreground">{{ TEXT.mcp.noCardsDescription }}</p>
      </div>
      <div v-else class="tw-space-y-2">
        <div
          v-for="card in cards"
          :key="`${card.hub_id}:${card.id}`"
          class="tw-group tw-flex tw-cursor-pointer tw-items-center tw-gap-3 tw-rounded-lg tw-border tw-border-border tw-p-3 tw-transition-colors hover:tw-bg-muted"
          @click="openDetail(card)"
        >
          <img v-if="card.icon_url" :src="card.icon_url" class="tw-h-10 tw-w-10 tw-rounded-md tw-object-cover" />
          <div v-else class="tw-flex tw-h-10 tw-w-10 tw-items-center tw-justify-center tw-rounded-md tw-bg-muted tw-text-sm tw-font-bold">
            {{ (card.display_name || card.name).slice(0, 1).toUpperCase() }}
          </div>
          <div class="tw-min-w-0 tw-flex-1">
            <div class="tw-flex tw-items-center tw-gap-2">
              <span class="tw-font-medium">{{ card.display_name || card.name }}</span>
              <span v-if="card.author" class="tw-text-xs tw-text-muted-foreground">@{{ card.author }}</span>
              <span v-if="card.auth === 'inputs'" class="tw-rounded-full tw-bg-amber-100 tw-px-2 tw-py-0.5 tw-text-10px tw-text-amber-700 dark:tw-bg-amber-900 dark:tw-text-amber-300">{{ TEXT.mcp.needsConfig }}</span>
              <span v-for="tag in (card.tags || []).slice(0, 4)" :key="tag" class="tw-rounded-full tw-bg-secondary tw-px-1.5 tw-py-0.5 tw-text-10px">#{{ tag }}</span>
            </div>
            <p class="tw-line-clamp-1 tw-text-xs tw-text-muted-foreground">{{ card.description }}</p>
          </div>
          <div class="tw-flex tw-items-center tw-gap-2">
            <span v-if="card.installs != null" class="tw-inline-flex tw-items-center tw-gap-1 tw-text-10px tw-text-muted-foreground">
              <Icon icon="lucide:download" class="tw-h-3 tw-w-3" />
              {{ card.installs.toLocaleString() }}
            </span>
            <span v-if="installedNames.has(card.name)" class="tw-inline-flex tw-items-center tw-gap-1 tw-rounded-full tw-bg-muted tw-px-3 tw-py-1 tw-text-11px tw-text-muted-foreground">
              <Icon icon="lucide:check" class="tw-h-3 tw-w-3" />
              {{ TEXT.mcp.installed }}
            </span>
            <el-button v-else size="mini" @click.stop="$emit('install', card)">
              {{ TEXT.mcp.install }}
            </el-button>
          </div>
        </div>
      </div>
      <div v-if="hasMore" class="tw-mt-4 tw-text-center">
        <el-button size="small" :loading="loadingMore" @click="loadMore">加载更多</el-button>
      </div>
    </div>

    <el-drawer
      :title="detailCard?.display_name || detailCard?.name || '详情'"
      :visible.sync="detailOpen"
      direction="rtl"
      size="30rem"
    >
      <div v-if="detailCard" class="tw-flex tw-h-full tw-flex-col tw-gap-4 tw-p-4">
        <p class="tw-text-sm tw-text-muted-foreground">{{ detailCard.description }}</p>
        <div>
          <span class="tw-text-xs tw-text-muted-foreground">{{ TEXT.mcp.configLabel }}</span>
          <pre class="tw-mt-1 tw-overflow-x-auto tw-rounded-md tw-bg-muted tw-p-3 tw-text-xs">{{ JSON.stringify(detailCard.config_template, null, 2) }}</pre>
        </div>
        <div v-if="detailCard.readme" class="tw-prose tw-prose-sm tw-max-w-none" v-html="detailCard.readme" />
      </div>
    </el-drawer>
  </div>
</template>

<script>
import { defineComponent, ref, computed } from '@/composables/vue';
import { Icon } from '@iconify/vue2';
import Spinner from '@/components/ui/Spinner.vue';
import { useMCPHubCards } from '@/composables/useMCPHubCards';
import { TEXT } from './text';

export default defineComponent({
  name: 'MCPHubPanel',
  components: { Icon, Spinner },
  props: {
    hubId: { type: String, required: true },
    hub: { type: Object, default: null },
    installedNames: { type: Set, default: () => new Set() },
  },
  setup(props, { emit }) {
    const query = ref('');
    const hubIdRef = computed(() => props.hubId);
    const queryRef = computed(() => query.value);
    const { cards, loading, loadingMore, error, hasMore, loadMore, refetch } = useMCPHubCards(hubIdRef, queryRef);

    const detailOpen = ref(false);
    const detailCard = ref(null);

    function openDetail(card) {
      detailCard.value = card;
      detailOpen.value = true;
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
      detailOpen,
      detailCard,
      openDetail,
      TEXT,
    };
  },
});
</script>
