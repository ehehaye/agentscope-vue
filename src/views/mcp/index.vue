<template>
  <div class="flex size-full gap-2 p-2">
    <aside class="flex w-64 min-w-0 flex-col overflow-hidden tw-rounded-22px bg-card">
      <div class="flex flex-col gap-y-1 p-5 pb-3">
        <div class="text-xl font-medium tw-tracking-neg-0_02em">{{ COMMON['mcp-hub'] }}</div>
        <div class="text-xs text-muted-foreground">{{ TEXT.mcp.subtitle }}</div>
      </div>
      <div class="flex-1 overflow-y-auto px-2">
        <div class="mb-1 px-2 text-xs font-medium text-muted-foreground">{{ COMMON.mine }}</div>
        <div
          class="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted"
          :class="{ 'bg-muted': !hubId }"
          @click="$router.push('/mcp')"
        >
          <Icon icon="lucide:plug" class="h-4 w-4" />
          <span class="flex-1 truncate">{{ COMMON['my-mcp'] }}</span>
          <span class="font-mono tw-text-10px text-muted-foreground">{{ mcps.length }}</span>
        </div>

        <div class="mb-1 mt-4 px-2 text-xs font-medium text-muted-foreground">{{ TEXT.mcp.hubsLabel }}</div>
        <div v-if="hubsLoading" class="flex justify-center py-4">
          <Spinner class="h-5 w-5" />
        </div>
        <div v-else-if="hubs.length === 0" class="px-2 py-4 text-center text-xs text-muted-foreground">
          {{ TEXT.mcp.noHubsTitle }}
        </div>
        <div v-else class="space-y-1">
          <div
            v-for="hub in hubs"
            :key="hub.hub_id"
            class="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted"
            :class="{ 'bg-muted': hubId === hub.hub_id }"
            :title="hub.description"
            @click="$router.push(`/mcp/${hub.hub_id}`)"
          >
            <img v-if="hub.icon_url" :src="hub.icon_url" class="h-4 w-4 rounded-sm object-cover" />
            <div v-else class="flex h-4 w-4 items-center justify-center rounded-sm bg-muted tw-text-10px font-bold">
              {{ hub.display_name.slice(0, 1).toUpperCase() }}
            </div>
            <span class="flex-1 truncate">{{ hub.display_name }}</span>
          </div>
        </div>
      </div>
    </aside>

    <main class="shadow-panel flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden tw-rounded-22px bg-card">
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
