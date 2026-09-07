<template>
  <div class="tw-flex tw-size-full tw-gap-2 tw-p-2">
    <aside class="tw-flex tw-w-64 tw-min-w-0 tw-flex-col tw-overflow-hidden tw-rounded-22px tw-bg-card">
      <div class="tw-flex tw-flex-col tw-gap-y-1 tw-p-5 tw-pb-3">
        <div class="tw-text-xl tw-font-medium tw-tracking-neg-0_02em">{{ COMMON['mcp-hub'] }}</div>
        <div class="tw-text-xs tw-text-muted-foreground">{{ TEXT.mcp.subtitle }}</div>
      </div>
      <div class="tw-flex-1 tw-overflow-y-auto tw-px-2">
        <div class="tw-mb-1 tw-px-2 tw-text-xs tw-font-medium tw-text-muted-foreground">{{ COMMON.mine }}</div>
        <div
          class="tw-flex tw-cursor-pointer tw-items-center tw-gap-2 tw-rounded-md tw-px-2 tw-py-1.5 tw-text-sm tw-transition-colors hover:tw-bg-muted"
          :class="{ 'tw-bg-muted': !hubId }"
          @click="$router.push('/mcp')"
        >
          <Icon icon="lucide:plug" class="tw-h-4 tw-w-4" />
          <span class="tw-flex-1 tw-truncate">{{ COMMON['my-mcp'] }}</span>
          <span class="tw-font-mono tw-text-10px tw-text-muted-foreground">{{ mcps.length }}</span>
        </div>

        <div class="tw-mb-1 tw-mt-4 tw-px-2 tw-text-xs tw-font-medium tw-text-muted-foreground">{{ TEXT.mcp.hubsLabel }}</div>
        <div v-if="hubsLoading" class="tw-flex tw-justify-center tw-py-4">
          <Spinner class="tw-h-5 tw-w-5" />
        </div>
        <div v-else-if="hubs.length === 0" class="tw-px-2 tw-py-4 tw-text-center tw-text-xs tw-text-muted-foreground">
          {{ TEXT.mcp.noHubsTitle }}
        </div>
        <div v-else class="tw-space-y-1">
          <div
            v-for="hub in hubs"
            :key="hub.hub_id"
            class="tw-flex tw-cursor-pointer tw-items-center tw-gap-2 tw-rounded-md tw-px-2 tw-py-1.5 tw-text-sm tw-transition-colors hover:tw-bg-muted"
            :class="{ 'tw-bg-muted': hubId === hub.hub_id }"
            :title="hub.description"
            @click="$router.push(`/mcp/${hub.hub_id}`)"
          >
            <img v-if="hub.icon_url" :src="hub.icon_url" class="tw-h-4 tw-w-4 tw-rounded-sm tw-object-cover" />
            <div v-else class="tw-flex tw-h-4 tw-w-4 tw-items-center tw-justify-center tw-rounded-sm tw-bg-muted tw-text-10px tw-font-bold">
              {{ hub.display_name.slice(0, 1).toUpperCase() }}
            </div>
            <span class="tw-flex-1 tw-truncate">{{ hub.display_name }}</span>
          </div>
        </div>
      </div>
    </aside>

    <main class="tw-shadow-panel tw-flex tw-min-h-0 tw-min-w-0 tw-flex-1 tw-flex-col tw-overflow-hidden tw-rounded-22px tw-bg-card">
      <MinePanel
        v-if="!hubId"
        :mcps="mcps"
        :loading="mcpsLoading"
        @edit="handleEdit"
        @remove="remove"
      />
      <HubPanel
        v-else
        :key="hubId"
        :hub-id="hubId"
        :hub="hubs.find((h) => h.hub_id === hubId)"
        :installed-names="installedNames"
        @install="handleInstall"
        @installed="refetchMcps"
      />
    </main>

    <InstallMCPDialog
      :visible.sync="installOpen"
      :card="installingCard"
      :editing="editingMcp"
      @installed="handleInstalled"
    />
  </div>
</template>

<script>
import { defineComponent, ref, computed } from '@/composables/vue';
import { Icon } from '@iconify/vue2';
import Spinner from '@/components/ui/Spinner.vue';
import InstallMCPDialog from '@/components/dialog/InstallMCPDialog.vue';
import MinePanel from './MinePanel.vue';
import HubPanel from './HubPanel.vue';
import { useRoute } from '@/composables/vue-router';
import { useMCPs } from '@/composables/useMCPs';
import { useMCPHubs } from '@/composables/useMCPHubs';
import { COMMON } from '@/constants/text';
import { TEXT } from './text';

export default defineComponent({
  name: 'MCPHubPage',
  components: { Icon, Spinner, InstallMCPDialog, MinePanel, HubPanel },
  setup() {
    const route = useRoute();
    const hubId = computed(() => route.params.hubId);

    const { mcps, loading: mcpsLoading, refetch: refetchMcps, remove } = useMCPs();
    const { hubs, loading: hubsLoading } = useMCPHubs();

    const installedNames = computed(() => new Set(mcps.value.map((m) => m.name)));

    const installOpen = ref(false);
    const installingCard = ref(null);
    const editingMcp = ref(null);

    function handleEdit(mcp) {
      editingMcp.value = mcp;
      installingCard.value = null;
      installOpen.value = true;
    }

    function handleInstall(card) {
      installingCard.value = card;
      editingMcp.value = null;
      installOpen.value = true;
    }

    async function handleInstalled() {
      await refetchMcps();
      installOpen.value = false;
      installingCard.value = null;
      editingMcp.value = null;
    }

    return {
      hubId,
      mcps,
      mcpsLoading,
      refetchMcps,
      remove,
      hubs,
      hubsLoading,
      installedNames,
      installOpen,
      installingCard,
      editingMcp,
      handleEdit,
      handleInstall,
      handleInstalled,
      COMMON,
      TEXT,
    };
  },
});
</script>
