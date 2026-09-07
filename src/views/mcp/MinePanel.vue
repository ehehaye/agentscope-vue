<template>
  <div class="tw-flex tw-h-full tw-flex-col tw-p-5">
    <div class="tw-mb-4 tw-flex tw-items-center tw-justify-between">
      <div>
        <div class="tw-text-lg tw-font-medium">{{ COMMON['my-mcp'] }}</div>
        <div class="tw-text-xs tw-text-muted-foreground">{{ TEXT.mcp.mineDescription }}</div>
      </div>
      <el-input v-if="mcps.length > 0" v-model="query" placeholder="搜索" size="small" class="tw-w-48" />
    </div>

    <div class="tw-flex-1 tw-overflow-y-auto">
      <div v-if="loading" class="tw-flex tw-justify-center tw-py-10">
        <Spinner class="tw-h-6 tw-w-6" />
      </div>
      <div v-else-if="mcps.length === 0" class="tw-flex tw-flex-col tw-items-center tw-gap-2 tw-py-10 tw-text-center">
        <Icon icon="lucide:plug" class="tw-h-8 tw-w-8 tw-text-muted-foreground" />
        <div class="tw-text-sm tw-font-medium">{{ TEXT.mcp.mineEmptyTitle }}</div>
        <p class="tw-text-xs tw-text-muted-foreground">{{ TEXT.mcp.mineEmptyDescription }}</p>
      </div>
      <div v-else-if="shown.length === 0" class="tw-py-10 tw-text-center tw-text-sm tw-text-muted-foreground">
        {{ TEXT.mcp.noCardsTitle }}
      </div>
      <div v-else class="tw-space-y-2">
        <div
          v-for="mcp in shown"
          :key="mcp.id"
          class="tw-flex tw-items-center tw-gap-3 tw-rounded-lg tw-border tw-border-border tw-p-3"
        >
          <img v-if="mcp.icon_url" :src="mcp.icon_url" class="tw-h-10 tw-w-10 tw-rounded-md tw-object-cover" />
          <div v-else class="tw-flex tw-h-10 tw-w-10 tw-items-center tw-justify-center tw-rounded-md tw-bg-muted tw-text-sm tw-font-bold">
            {{ (mcp.display_name || mcp.name).slice(0, 1).toUpperCase() }}
          </div>
          <div class="tw-min-w-0 tw-flex-1">
            <div class="tw-flex tw-items-center tw-gap-2">
              <span class="tw-font-medium">{{ mcp.display_name || mcp.name }}</span>
              <span v-if="mcp.author" class="tw-text-xs tw-text-muted-foreground">@{{ mcp.author }}</span>
              <span v-if="mcp.is_stateful" class="tw-text-xs tw-text-muted-foreground">#{{ TEXT.mcp.stateful }}</span>
            </div>
            <p class="tw-line-clamp-1 tw-text-xs tw-text-muted-foreground">{{ mcp.description }}</p>
          </div>
          <div class="tw-flex tw-items-center tw-gap-2">
            <span v-if="mcp.version" class="tw-text-xs tw-text-muted-foreground">{{ mcp.version }}</span>
            <el-button v-if="mcp.hub_id && mcp.card_id" type="text" size="mini" @click="$emit('edit', mcp)">
              <Icon icon="lucide:pencil" class="tw-h-3.5 tw-w-3.5" />
            </el-button>
            <el-button type="text" size="mini" @click="$emit('remove', mcp.id)">
              <Icon icon="lucide:trash-2" class="tw-h-3.5 tw-w-3.5" />
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
