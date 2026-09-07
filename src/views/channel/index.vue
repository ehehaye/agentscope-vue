<template>
  <div class="flex h-full w-full gap-2 p-2">
    <!-- 左侧列表 -->
    <main class="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-panel">
      <div class="border-b border-border px-6 pt-5 pb-4">
        <div class="text-2xl font-semibold">频道</div>
        <div class="mt-1 text-sm text-muted-foreground">管理消息通道与路由规则</div>
      </div>

      <div class="flex-1 overflow-y-auto px-6 py-6">
        <div v-if="loading" class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <el-skeleton v-for="i in 4" :key="i" :rows="3" animated />
        </div>

        <template v-else>
          <el-empty v-if="channels.length === 0" description="暂无频道">
            <template slot="image">
              <Icon icon="lucide:cable" class="mx-auto h-12 w-12 text-muted-foreground" />
            </template>
          </el-empty>

          <section v-else>
            <div class="mb-4 flex items-center gap-2">
              <span class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">已启用</span>
              <el-tag size="mini" type="info">{{ channels.length }}</el-tag>
            </div>

            <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              <div
                v-for="ch in channels"
                :key="ch.id"
                class="group cursor-pointer rounded-xl border border-border bg-card p-4 shadow-panel transition hover:border-ring/40"
                @click="selectedId = ch.id"
              >
                <div class="mb-3 flex items-start justify-between gap-3">
                  <div class="flex min-w-0 flex-1 items-center gap-3">
                    <TypeAvatar :type="typeOf(ch.channel_type)" class="h-9 w-9 rounded-lg" />
                    <div class="min-w-0 flex-1">
                      <div class="truncate text-sm font-semibold">{{ ch.name?.trim() || typeOf(ch.channel_type)?.display_name || ch.channel_type }}</div>
                      <div class="truncate font-mono text-xs text-muted-foreground">{{ typeOf(ch.channel_type)?.display_name || ch.channel_type }}</div>
                    </div>
                  </div>
                  <el-switch
                    :value="ch.enabled"
                    @click.stop
                    @change="(v) => toggleEnabled(ch, v)"
                  />
                </div>

                <div class="space-y-1 text-xs">
                  <div class="flex items-center justify-between gap-2">
                    <span class="text-muted-foreground">助手</span>
                    <span class="truncate">{{ agentName(lastBinding(ch)?.agent_id) }}</span>
                  </div>
                  <div class="flex items-center justify-between gap-2">
                    <span class="text-muted-foreground">路由</span>
                    <span class="font-mono">{{ ch.routing?.bindings?.length || 0 }} 条规则</span>
                  </div>
                  <div v-if="ch.session?.chat_model_config?.model" class="flex items-center justify-between gap-2">
                    <span class="text-muted-foreground">模型</span>
                    <span class="truncate font-mono">{{ ch.session.chat_model_config.model }}</span>
                  </div>
                  <div class="flex items-center justify-between gap-2">
                    <span class="text-muted-foreground">状态</span>
                    <ChannelStatusBadge :enabled="ch.enabled" :status="statuses[ch.id]" />
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div class="my-8 flex items-center gap-4">
            <span class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Icon icon="lucide:plus" class="h-3.5 w-3.5 text-primary" />
              添加频道
            </span>
            <div class="flex-1 border-t border-dashed border-border" />
          </div>

          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            <button
              v-for="ct in types"
              :key="ct.channel_type"
              class="group flex items-start gap-3 rounded-xl border border-border bg-card p-4 text-left shadow-panel transition hover:border-ring/40"
              @click="openCreate(ct.channel_type)"
            >
              <TypeAvatar :type="ct" class="h-10 w-10 rounded-lg" />
              <div class="min-w-0 flex-1">
                <div class="truncate text-sm font-semibold">{{ ct.display_name }}</div>
                <div v-if="ct.description" class="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{{ ct.description }}</div>
                <div v-else class="font-mono text-xs text-muted-foreground">{{ ct.channel_type }}</div>
              </div>
              <Icon icon="lucide:plus" class="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
            </button>
          </div>
        </template>
      </div>
    </main>

    <!-- 右侧详情 -->
    <ChannelDetailPanel
      :visible.sync="detailOpen"
      :channel="selected"
      :type="selectedType"
      :status="statuses[selected?.id]"
      :agent-name="agentName"
      @edit="editOpen = true"
      @delete="deleteOpen = true"
    />

    <CreateChannelDialog
      :visible.sync="createOpen"
      :initial-type="createDefaultType"
      :agents="agents"
      @created="onCreated"
    />

    <EditChannelDialog
      v-if="selected"
      :visible.sync="editOpen"
      :channel="selected"
      :agents="agents"
      @updated="onUpdated"
    />

    <DeleteDialog
      v-if="selected"
      :visible.sync="deleteOpen"
      :title="deleteTitle"
      description="删除后无法恢复，是否继续？"
      :loading="deleteLoading"
      @confirm="handleDelete"
    />
  </div>
</template>

<script>
import { defineComponent, ref, computed, watch, onBeforeUnmount } from '@/composables/vue';
import { Icon } from '@iconify/vue2';
import { channelApi } from '@/api';
import { useChannels } from '@/composables/useChannels';
import { useAgents } from '@/composables/useAgents';
import TypeAvatar from './TypeAvatar.vue';
import ChannelStatusBadge from './ChannelStatusBadge.vue';
import ChannelDetailPanel from './ChannelDetailPanel.vue';
import CreateChannelDialog from './CreateChannelDialog.vue';
import EditChannelDialog from './EditChannelDialog.vue';
import DeleteDialog from '@/components/dialog/DeleteDialog.vue';

export default defineComponent({
  name: 'ChannelPage',
  components: {
    Icon,
    TypeAvatar,
    ChannelStatusBadge,
    ChannelDetailPanel,
    CreateChannelDialog,
    EditChannelDialog,
    DeleteDialog,
  },
  setup() {
    const { channels, loading, refetch, remove, enable, disable } = useChannels();
    const { agents } = useAgents();

    const types = ref([]);
    const statuses = ref({});
    const selectedId = ref(null);
    const createOpen = ref(false);
    const createDefaultType = ref('');
    const editOpen = ref(false);
    const deleteOpen = ref(false);
    const deleteLoading = ref(false);

    const selected = computed(() => channels.value.find((c) => c.id === selectedId.value) || null);
    const selectedType = computed(() => (selected.value ? typeOf(selected.value.channel_type) : null));

    function typeOf(channelType) {
      return types.value.find((ct) => ct.channel_type === channelType);
    }

    function agentName(agentId) {
      return agents.value.find((a) => a.id === agentId)?.data?.name || agentId?.slice(0, 8) || '—';
    }

    function lastBinding(ch) {
      return ch?.routing?.bindings?.[ch.routing.bindings.length - 1];
    }

    function openCreate(type) {
      createDefaultType.value = type;
      createOpen.value = true;
    }

    function onCreated() {
      selectedId.value = channels.value[0]?.id || null;
    }

    function onUpdated() {
      // 列表已自动刷新
    }

    async function toggleEnabled(ch, v) {
      try {
        if (v) await enable(ch.id);
        else await disable(ch.id);
      } catch {
        // api 层已 toast
      }
    }

    async function handleDelete() {
      if (!selected.value) return;
      deleteLoading.value = true;
      try {
        await remove(selected.value.id);
        selectedId.value = null;
        deleteOpen.value = false;
      } finally {
        deleteLoading.value = false;
      }
    }

    const deleteTitle = computed(() => {
      if (!selected.value) return '确认删除';
      const ch = selected.value;
      const name = ch.name?.trim() || `${typeOf(ch.channel_type)?.display_name || ch.channel_type} · ${ch.id.slice(0, 8)}`;
      return `删除频道「${name}」`;
    });

    const detailOpen = computed({
      get: () => !!selectedId.value,
      set: (v) => {
        if (!v) selectedId.value = null;
      },
    });

    // 加载 channel types
    channelApi.listTypes().then((res) => {
      types.value = res || [];
    }).catch(() => {});

    // 轮询已启用 channel 状态
    let timer = null;
    let alive = true;
    async function pollStatuses() {
      const ids = channels.value.filter((c) => c.enabled).map((c) => c.id);
      if (ids.length === 0) {
        statuses.value = {};
        return;
      }
      const results = await Promise.all(
        ids.map((id) => channelApi.status(id).then((s) => [id, s]).catch(() => null)),
      );
      if (!alive) return;
      const next = {};
      for (const r of results) if (r) next[r[0]] = r[1];
      statuses.value = next;
    }

    watch(
      () => channels.value.map((c) => c.id + ':' + c.enabled).join(','),
      () => {
        if (timer) clearInterval(timer);
        pollStatuses();
        timer = setInterval(pollStatuses, 10000);
      },
      { immediate: true },
    );

    onBeforeUnmount(() => {
      alive = false;
      if (timer) clearInterval(timer);
    });

    return {
      channels,
      loading,
      agents,
      types,
      statuses,
      selectedId,
      selected,
      selectedType,
      createOpen,
      createDefaultType,
      editOpen,
      deleteOpen,
      deleteLoading,
      deleteTitle,
      detailOpen,
      typeOf,
      agentName,
      lastBinding,
      openCreate,
      onCreated,
      onUpdated,
      toggleEnabled,
      handleDelete,
      refetch,
    };
  },
});
</script>
