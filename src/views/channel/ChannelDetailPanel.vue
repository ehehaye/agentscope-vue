<template>
  <el-drawer
    :visible.sync="drawerVisible"
    :title="title"
    size="420px"
    :with-header="true"
    :modal="false"
    :wrapper-closable="false"
    custom-class="channel-detail-drawer"
    @closed="handleClose"
  >
    <div v-if="channel" class="flex h-full flex-col gap-5 overflow-y-auto p-4">
      <div class="flex items-start gap-3">
        <TypeAvatar :type="type" class="h-10 w-10" />
        <div class="min-w-0 flex-1">
          <div class="truncate text-base font-semibold">{{ name }}</div>
          <div class="mt-0.5 flex items-center gap-2">
            <ChannelStatusBadge :enabled="channel.enabled" :status="status" />
            <span class="font-mono text-xs text-muted-foreground">{{ channel.id.slice(0, 8) }}</span>
          </div>
        </div>
      </div>

      <el-alert v-if="status?.last_error" :title="status.last_error" type="error" :closable="false" show-icon />

      <section>
        <div class="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">基础配置</div>
        <el-descriptions :column="1" border size="small">
          <el-descriptions-item label="平台类型">{{ typeName }}</el-descriptions-item>
          <el-descriptions-item v-if="model" label="模型">{{ model }}</el-descriptions-item>
          <el-descriptions-item label="权限模式">{{ channel.session?.permission_mode }}</el-descriptions-item>
          <el-descriptions-item v-for="row in configRows" :key="row.label" :label="row.label">
            <span v-if="typeof row.value === 'boolean'">
              <Icon v-if="row.value" icon="lucide:check" class="h-4 w-4 text-emerald-600" />
              <Icon v-else icon="lucide:minus" class="h-4 w-4 text-muted-foreground/40" />
            </span>
            <span v-else class="font-mono text-xs">{{ row.value }}</span>
          </el-descriptions-item>
        </el-descriptions>
      </section>

      <section>
        <div class="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <span>路由规则</span>
          <el-tag size="mini" type="info">{{ channel.routing?.bindings?.length || 0 }}</el-tag>
        </div>
        <el-table :data="channel.routing?.bindings || []" size="small" border>
          <el-table-column label="条件" show-overflow-tooltip>
            <template slot-scope="scope">
              {{ scope.$index === (channel.routing?.bindings?.length || 0) - 1 ? '默认' : `${scope.row.match_key} = ${scope.row.match_value}` }}
            </template>
          </el-table-column>
          <el-table-column label="助手" show-overflow-tooltip>
            <template slot-scope="scope">{{ agentName(scope.row.agent_id) }}</template>
          </el-table-column>
          <el-table-column label="范围" width="110">
            <template slot-scope="scope">{{ scope.row.session_scope === 'per_chat' ? '按聊天' : '按用户' }}</template>
          </el-table-column>
        </el-table>
      </section>

      <section class="flex-1">
        <div class="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <span>会话</span>
          <el-tag size="mini" type="info">{{ sessions.length }}</el-tag>
        </div>
        <el-empty v-if="sessions.length === 0" description="暂无会话" />
        <el-table v-else :data="sessions" size="small" border class="cursor-pointer">
          <el-table-column label="会话" show-overflow-tooltip>
            <template slot-scope="scope">{{ scope.row.config?.name || scope.row.id }}</template>
          </el-table-column>
          <el-table-column label="创建时间" width="110">
            <template slot-scope="scope">{{ formatDate(scope.row.created_at) }}</template>
          </el-table-column>
          <el-table-column width="50">
            <template slot-scope="scope">
              <router-link :to="`/chat/${scope.row.agent_id}/${scope.row.id}`" title="打开聊天">
                <Icon icon="lucide:chevron-right" class="h-4 w-4 text-muted-foreground" />
              </router-link>
            </template>
          </el-table-column>
        </el-table>
      </section>

      <div class="pt-2">
        <el-button type="danger" plain class="w-full" @click="$emit('delete')">
          <Icon icon="lucide:trash-2" class="mr-1 h-4 w-4" />
          删除频道
        </el-button>
      </div>
    </div>
  </el-drawer>
</template>

<script>
import { defineComponent, computed, ref, watch } from '@vue/composition-api';
import { channelApi } from '@/api';
import { Icon } from '@iconify/vue2';
import TypeAvatar from './TypeAvatar.vue';
import ChannelStatusBadge from './ChannelStatusBadge.vue';

export default defineComponent({
  name: 'ChannelDetailPanel',
  components: { TypeAvatar, ChannelStatusBadge, Icon },
  props: {
    visible: { type: Boolean, default: false },
    channel: { type: Object, default: null },
    type: { type: Object, default: null },
    status: { type: Object, default: null },
    agentName: { type: Function, default: (id) => id },
  },
  setup(props, { emit }) {
    const sessions = ref([]);

    const typeName = computed(() => props.type?.display_name || props.channel?.channel_type || '');
    const name = computed(() => props.channel?.name?.trim() || typeName.value);
    const title = computed(() => name.value);
    const model = computed(() => props.channel?.session?.chat_model_config?.model);

    const configRows = computed(() => {
      const rows = [];
      const cfgProps = props.type?.config_schema?.properties || {};
      for (const [key, def] of Object.entries(cfgProps)) {
        const raw = props.channel?.platform_config?.[key] ?? def.default;
        rows.push({
          label: def.title || key,
          value: typeof raw === 'boolean' ? raw : String(raw ?? ''),
        });
      }
      return rows;
    });

    function formatDate(v) {
      if (!v) return '—';
      return new Date(v).toLocaleDateString();
    }

    async function loadSessions() {
      if (!props.channel) {
        sessions.value = [];
        return;
      }
      try {
        const res = await channelApi.listSessions(props.channel.id);
        sessions.value = res?.sessions || [];
      } catch {
        sessions.value = [];
      }
    }

    watch(
      () => props.channel?.id,
      () => loadSessions(),
      { immediate: true },
    );

    function handleClose() {
      emit('update:visible', false);
    }

    return {
      drawerVisible: computed({ get: () => props.visible, set: (v) => emit('update:visible', v) }),
      title,
      typeName,
      name,
      model,
      configRows,
      sessions,
      formatDate,
      handleClose,
    };
  },
});
</script>
