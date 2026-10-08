<template>
  <div class="tw-flex tw-h-full tw-flex-col tw-gap-2">
    <span class="tw-text-sm tw-text-muted-foreground">当前会话已装备的 MCP 服务。</span>
    <el-input
      v-model="search"
      placeholder="搜索 MCP"
    ></el-input>

    <div class="tw-flex tw-flex-1 tw-flex-col tw-gap-2 tw-overflow-y-auto">
      <template v-if="loading">
        <div class="tw-flex tw-flex-1 tw-items-center tw-justify-center tw-text-sm tw-text-muted-foreground">
          加载中…
        </div>
      </template>
      <template v-else-if="filtered.length === 0">
        <PanelEmpty
          :icon="emptyIcon"
          :title="emptyTitle"
          :description="emptyDescription"
        />
      </template>
      <template v-else>
        <Item
          v-for="mcp in filtered"
          :key="mcp.name"
          variant="outline"
          class="tw-group"
        >
          <ItemMedia variant="image">
            <img
              v-if="installedByName[mcp.name]?.icon_url"
              :src="installedByName[mcp.name].icon_url"
              :alt="mcp.name"
              class="tw-size-full tw-object-cover"
            />
            <span
              v-else
              class="tw-flex tw-size-full tw-items-center tw-justify-center tw-text-sm tw-font-medium"
            >
              {{ mcp.name.slice(0, 1).toUpperCase() }}
            </span>
          </ItemMedia>
          <ItemContent>
            <ItemTitle>
              <span class="tw-truncate">{{ mcp.name }}</span>
              <span
                v-if="installedByName[mcp.name]?.author"
                class="tw-text-xs tw-text-muted-foreground"
              >
                @{{ installedByName[mcp.name].author }}
              </span>
              <span class="tw-text-xs tw-text-muted-foreground/50">
                {{ mcp.mcp_config?.type === 'stdio_mcp' ? '#stdio' : '#http' }}
              </span>
            </ItemTitle>
            <ItemDescription
              v-if="installedByName[mcp.name]?.description"
              class="tw-line-clamp-1"
            >
              {{ installedByName[mcp.name].description }}
            </ItemDescription>
          </ItemContent>
          <ItemActions>
            <span
              class="tw-size-2 tw-shrink-0 tw-rounded-full"
              :class="mcp.is_healthy ? 'tw-bg-green-500' : 'tw-bg-red-500'"
              :title="mcp.is_healthy ? '健康' : '异常'"
            />
            <el-button
              type="text"
              size="mini"
              class="tw-opacity-0 group-hover:tw-opacity-100"
              @click="askRemove(mcp.name)"
            >
              <Icon
                icon="lucide:trash"
                class="tw-h-3 tw-w-3"
              />
            </el-button>
          </ItemActions>
        </Item>
      </template>
    </div>

    <AddMCPDialog
      :present="presentNames"
      :on-add="onAdd"
      :on-add-from-library="onAddFromLibrary"
    />
  </div>
</template>

<script>
import { defineComponent, ref, computed } from '@/composables/vue';
import { Icon } from '@/components/ui/Icon';
import { Item, ItemMedia, ItemContent, ItemTitle, ItemDescription, ItemActions } from '@/components/ui/Item.js';
import PanelEmpty from './PanelEmpty.vue';
import AddMCPDialog from '@/components/dialog/AddMCPDialog.vue';
import { useMCPs } from '@/composables/useMCPs';
import { confirmDialog } from '@/utils/common';

export default defineComponent({
  name: 'McpPanel',
  components: {
    Icon,
    Item,
    ItemMedia,
    ItemContent,
    ItemTitle,
    ItemDescription,
    ItemActions,
    PanelEmpty,
    AddMCPDialog,
  },
  props: {
    mcps: { type: Array, default: () => [] },
    loading: { type: Boolean, default: false },
    onAdd: { type: Function, default: () => Promise.resolve(null) },
    onAddFromLibrary: { type: Function, default: () => Promise.resolve(null) },
    onRemove: { type: Function, default: () => Promise.resolve(null) },
  },
  setup(props) {
    const search = ref('');
    const presentNames = computed(() => new Set(props.mcps.map((m) => m.name)));

    const { mcps: library } = useMCPs();
    const installedByName = computed(() => {
      const map = {};
      for (const m of library.value) map[m.name] = m;
      return map;
    });

    const filtered = computed(() => {
      if (!search.value) return props.mcps;
      const q = search.value.toLowerCase();
      return props.mcps.filter((m) => m.name.toLowerCase().includes(q));
    });

    const emptyIcon = computed(() => (search.value ? 'lucide:search-x' : 'lucide:unplug'));
    const emptyTitle = computed(() => (search.value ? '无搜索结果' : '暂无 MCP'));
    const emptyDescription = computed(() =>
      search.value ? `没有匹配 "${search.value}" 的 MCP。` : '当前会话尚未装备任何 MCP 服务。',
    );

    async function askRemove(name) {
      if (!name) return;
      await confirmDialog({
        message: `确定删除 MCP「${name}」吗？`,
        onSubmit: async () => {
          if (!props.onRemove) return;
          await props.onRemove(name);
        },
      });
    }

    return {
      search,
      presentNames,
      filtered,
      installedByName,
      emptyIcon,
      emptyTitle,
      emptyDescription,
      askRemove,
    };
  },
});
</script>
