<template>
  <div class="flex h-full flex-col gap-2">
    <span class="text-sm text-muted-foreground">当前会话已装备的 MCP 服务。</span>
    <InputGroup>
      <InputGroupInput v-model="search" placeholder="搜索 MCP" />
      <InputGroupAddon align="inline-end">
        <Icon icon="lucide:search" class="h-4 w-4" />
      </InputGroupAddon>
    </InputGroup>

    <div class="flex flex-1 flex-col gap-2 overflow-y-auto">
      <template v-if="loading">
        <div class="flex flex-1 items-center justify-center text-sm text-muted-foreground">加载中…</div>
      </template>
      <template v-else-if="filtered.length === 0">
        <PanelEmpty
          :icon="emptyIcon"
          :title="emptyTitle"
          :description="emptyDescription"
        />
      </template>
      <template v-else>
        <Item v-for="mcp in filtered" :key="mcp.name" variant="outline" class="group/mcp">
          <ItemMedia variant="image">
            <img
              v-if="installedByName[mcp.name]?.icon_url"
              :src="installedByName[mcp.name].icon_url"
              :alt="mcp.name"
              class="size-full object-cover"
            />
            <span v-else class="flex size-full items-center justify-center text-sm font-medium">
              {{ mcp.name.slice(0, 1).toUpperCase() }}
            </span>
          </ItemMedia>
          <ItemContent>
            <ItemTitle>
              <span class="truncate">{{ mcp.name }}</span>
              <span v-if="installedByName[mcp.name]?.author" class="text-xs text-muted-foreground">
                @{{ installedByName[mcp.name].author }}
              </span>
              <span class="text-xs text-muted-foreground/50">
                {{ mcp.mcp_config?.type === 'stdio_mcp' ? '#stdio' : '#http' }}
              </span>
            </ItemTitle>
            <ItemDescription v-if="installedByName[mcp.name]?.description" class="line-clamp-1">
              {{ installedByName[mcp.name].description }}
            </ItemDescription>
          </ItemContent>
          <ItemActions>
            <span
              class="size-2 shrink-0 rounded-full"
              :class="mcp.is_healthy ? 'bg-green-500' : 'bg-red-500'"
              :title="mcp.is_healthy ? '健康' : '异常'"
            />
            <el-button
              type="text"
              size="mini"
              class="opacity-0 group-hover/mcp:opacity-100"
              @click="askRemove(mcp.name)"
            >
              <Icon icon="lucide:trash" class="h-3 w-3" />
            </el-button>
          </ItemActions>
        </Item>
      </template>
    </div>

    <router-link to="/mcp">
      <el-button type="primary" size="small" class="w-full">
        <Icon icon="lucide:plus-circle" class="h-4 w-4" />
        添加 MCP
      </el-button>
    </router-link>

    <DeleteDialog
      :visible.sync="deleteVisible"
      :title="deleteTitle"
      description="删除后无法恢复，是否继续？"
      :loading="deleteLoading"
      @confirm="doRemove"
    />
  </div>
</template>

<script>
import { defineComponent, ref, computed } from '@vue/composition-api';
import { Icon } from '@iconify/vue2';
import {
  InputGroup,
  InputGroupInput,
  InputGroupAddon,
} from '@/components/ui/InputGroup.js';
import {
  Item,
  ItemMedia,
  ItemContent,
  ItemTitle,
  ItemDescription,
  ItemActions,
} from '@/components/ui/Item.js';
import PanelEmpty from './PanelEmpty.vue';
import DeleteDialog from '@/components/dialog/DeleteDialog.vue';
import { useMCPs } from '@/composables/useMCPs';

export default defineComponent({
  name: 'McpPanel',
  components: {
    Icon,
    InputGroup,
    InputGroupInput,
    InputGroupAddon,
    Item,
    ItemMedia,
    ItemContent,
    ItemTitle,
    ItemDescription,
    ItemActions,
    PanelEmpty,
    DeleteDialog,
  },
  props: {
    mcps: { type: Array, default: () => [] },
    loading: { type: Boolean, default: false },
    onRemove: { type: Function, default: null },
  },
  setup(props) {
    const search = ref('');
    const deleteVisible = ref(false);
    const deleteTarget = ref('');
    const deleteLoading = ref(false);

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
    const deleteTitle = computed(() => `删除 MCP "${deleteTarget.value}"？`);

    function askRemove(name) {
      deleteTarget.value = name;
      deleteVisible.value = true;
    }

    async function doRemove() {
      if (!props.onRemove || !deleteTarget.value) return;
      deleteLoading.value = true;
      try {
        await props.onRemove(deleteTarget.value);
      } finally {
        deleteLoading.value = false;
        deleteVisible.value = false;
        deleteTarget.value = '';
      }
    }

    return {
      search,
      filtered,
      installedByName,
      emptyIcon,
      emptyTitle,
      emptyDescription,
      deleteTitle,
      askRemove,
      deleteVisible,
      deleteTarget,
      deleteLoading,
      doRemove,
    };
  },
});
</script>
