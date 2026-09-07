<template>
  <div class="flex h-full flex-col p-5">
    <div class="mb-4 flex items-center justify-between">
      <div>
        <div class="text-lg font-medium">{{ COMMON['my-mcp'] }}</div>
        <div class="text-xs text-muted-foreground">{{ TEXT.mcp.mineDescription }}</div>
      </div>
      <el-input v-if="mcps.length > 0" v-model="query" placeholder="搜索" size="small" class="w-48" />
    </div>

    <div class="flex-1 overflow-y-auto">
      <div v-if="loading" class="flex justify-center py-10">
        <Spinner class="h-6 w-6" />
      </div>
      <div v-else-if="mcps.length === 0" class="flex flex-col items-center gap-2 py-10 text-center">
        <Icon icon="lucide:plug" class="h-8 w-8 text-muted-foreground" />
        <div class="text-sm font-medium">{{ TEXT.mcp.mineEmptyTitle }}</div>
        <p class="text-xs text-muted-foreground">{{ TEXT.mcp.mineEmptyDescription }}</p>
      </div>
      <div v-else-if="shown.length === 0" class="py-10 text-center text-sm text-muted-foreground">
        {{ TEXT.mcp.noCardsTitle }}
      </div>
      <div v-else class="space-y-2">
        <div
          v-for="mcp in shown"
          :key="mcp.id"
          class="flex items-center gap-3 rounded-lg border border-border p-3"
        >
          <img v-if="mcp.icon_url" :src="mcp.icon_url" class="h-10 w-10 rounded-md object-cover" />
          <div v-else class="flex h-10 w-10 items-center justify-center rounded-md bg-muted text-sm font-bold">
            {{ (mcp.display_name || mcp.name).slice(0, 1).toUpperCase() }}
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2">
              <span class="font-medium">{{ mcp.display_name || mcp.name }}</span>
              <span v-if="mcp.author" class="text-xs text-muted-foreground">@{{ mcp.author }}</span>
              <span v-if="mcp.is_stateful" class="text-xs text-muted-foreground">#{{ TEXT.mcp.stateful }}</span>
            </div>
            <p class="line-clamp-1 text-xs text-muted-foreground">{{ mcp.description }}</p>
          </div>
          <div class="flex items-center gap-2">
            <span v-if="mcp.version" class="text-xs text-muted-foreground">{{ mcp.version }}</span>
            <el-button v-if="mcp.hub_id && mcp.card_id" type="text" size="mini" @click="$emit('edit', mcp)">
              <Icon icon="lucide:pencil" class="h-3.5 w-3.5" />
            </el-button>
            <el-button type="text" size="mini" @click="$emit('remove', mcp.id)">
              <Icon icon="lucide:trash-2" class="h-3.5 w-3.5" />
            </el-button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { defineComponent, ref, computed } from '@/composables/vue';
import { Icon } from '@iconify/vue2';
import Spinner from '@/components/ui/Spinner.vue';
import { COMMON } from '@/constants/text';
import { TEXT } from './text';

export default defineComponent({
  name: 'MCPMinePanel',
  components: { Icon, Spinner },
  props: {
    mcps: { type: Array, default: () => [] },
    loading: { type: Boolean, default: false },
  },
  setup(props) {
    const query = ref('');
    const shown = computed(() => {
      const needle = query.value.trim().toLowerCase();
      if (!needle) return props.mcps;
      return props.mcps.filter((mcp) =>
        [mcp.name, mcp.display_name, mcp.description, ...(mcp.tags || [])]
          .filter(Boolean)
          .some((field) => field.toLowerCase().includes(needle)),
      );
    });
    return { query, shown, COMMON, TEXT };
  },
});
</script>
