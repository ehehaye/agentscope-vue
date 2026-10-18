<template>
  <div class="tw-flex tw-size-full tw-gap-2 tw-p-2">
    <aside class="tw-flex tw-w-64 tw-min-w-0 tw-flex-col tw-overflow-hidden tw-rounded-22px tw-bg-card">
      <div class="tw-flex tw-flex-col tw-gap-y-1 tw-p-5 tw-pb-3">
        <div class="tw-text-xl tw-font-medium tw-tracking-neg-0_02em">SOP</div>
        <div class="tw-text-xs tw-text-muted-foreground">保存标准作业流程，并发起运行。</div>
      </div>
      <div class="tw-flex-1 tw-overflow-y-auto tw-px-2">
        <div
          class="tw-mb-2 tw-flex tw-items-center tw-justify-between tw-px-2 tw-text-xs tw-font-medium tw-text-muted-foreground"
        >
          <span>流程列表</span>
          <el-button
            type="text"
            size="mini"
            @click="openCreate"
          >
            <Icon
              icon="lucide:plus"
              class="tw-h-3.5 tw-w-3.5"
            />
          </el-button>
        </div>

        <div
          v-if="loading"
          class="tw-flex tw-flex-col tw-items-center tw-justify-center tw-py-8"
        >
          <Spinner class="tw-h-6 tw-w-6" />
          <p class="tw-mt-2 tw-text-xs tw-text-muted-foreground">加载中…</p>
        </div>

        <PanelEmpty
          v-else-if="sops.length === 0"
          icon="lucide:list-checks"
          title="暂无流程"
          description="创建一份 SOP，然后发起运行。"
        >
          <el-button
            size="small"
            @click="openCreate"
          >
            新建流程
          </el-button>
        </PanelEmpty>

        <div
          v-else
          class="tw-space-y-1"
        >
          <div
            v-for="sop in sops"
            :key="sop.id"
            class="tw-flex tw-cursor-pointer tw-flex-col tw-gap-0.5 tw-rounded-md tw-px-2 tw-py-1.5 tw-transition-colors hover:tw-bg-muted"
            :class="{ 'tw-bg-muted': selectedSopId === sop.id }"
            @click="selectSop(sop)"
          >
            <span class="tw-truncate tw-text-sm">{{ sop.data.name }}</span>
            <span
              v-if="sop.data.description"
              class="tw-truncate tw-text-10px tw-text-muted-foreground"
              >{{ sop.data.description }}</span
            >
          </div>
        </div>
      </div>
    </aside>

    <main
      class="tw-shadow-panel tw-flex tw-min-h-0 tw-min-w-0 tw-flex-1 tw-flex-col tw-overflow-hidden tw-rounded-22px tw-bg-card"
    >
      <SopDetailPanel
        v-if="selectedSop"
        :sop="selectedSop"
        :runs="runs"
        :runs-loading="runsLoading"
        :agents="agents"
        @start="openStart"
        @edit="openEdit"
        @remove="handleRemoveSop"
        @open-run="openRun"
        @delete-run="handleDeleteRun"
        @refresh-runs="refetchRuns"
      />

      <div
        v-else-if="error"
        class="tw-flex tw-flex-1 tw-items-center tw-justify-center tw-p-6"
      >
        <PanelEmpty
          icon="lucide:alert-circle"
          title="SOP 接口不可用"
          :description="error.message || '当前后端未提供 SOP 服务，请升级到 AgentScope 2.0.9 及以上版本。'"
        >
          <el-button
            size="small"
            @click="refetch"
            >重试</el-button
          >
        </PanelEmpty>
      </div>

      <div
        v-else
        class="tw-flex tw-h-full tw-items-center tw-justify-center"
      >
        <div class="tw-flex tw-max-w-sm tw-flex-col tw-items-center tw-gap-2 tw-text-center">
          <div class="tw-text-sm tw-font-medium">选择流程</div>
          <p class="tw-text-xs tw-text-muted-foreground">从左侧列表选择一个流程查看详情，或新建一个流程。</p>
        </div>
      </div>
    </main>

    <SopEditorDialog
      :visible.sync="editorVisible"
      :sop="editingSop"
      :agents="agents"
      @saved="handleSaved"
    />

    <StartRunDialog
      :visible.sync="startVisible"
      :sop="selectedSop"
      @started="handleStarted"
    />

    <SopRunDetailDrawer
      :visible.sync="runDrawerVisible"
      :sop-run-id="activeRunId"
      :agents="agents"
      @changed="refetchRuns"
      @open-session="handleOpenSession"
    />
  </div>
</template>

<script>
import { defineComponent, ref, computed, watch } from '@/composables/vue';
import { useRoute, useRouter } from '@/composables/vue-router';
import { Icon } from '@/components/ui/Icon';
import Spinner from '@/components/ui/Spinner.vue';
import PanelEmpty from '@/components/panel/PanelEmpty.vue';
import SopDetailPanel from './SopDetailPanel.vue';
import SopEditorDialog from './SopEditorDialog.vue';
import StartRunDialog from './StartRunDialog.vue';
import SopRunDetailDrawer from './SopRunDetailDrawer.vue';
import { useSops } from '@/composables/useSops';
import { useSopRuns } from '@/composables/useSopRuns';
import { useAgents } from '@/composables/useAgents';
import { confirmDialog } from '@/utils/common';

export default defineComponent({
  name: 'SopPage',
  components: {
    Icon,
    Spinner,
    PanelEmpty,
    SopDetailPanel,
    SopEditorDialog,
    StartRunDialog,
    SopRunDetailDrawer,
  },
  setup() {
    const route = useRoute();
    const router = useRouter();

    const { sops, loading, error, refetch, remove } = useSops();
    const { agents } = useAgents();

    const selectedSopId = ref(route.params.sopId || null);
    const selectedSop = computed(() => sops.value.find((sop) => sop.id === selectedSopId.value) || null);

    const { runs, loading: runsLoading, refetch: refetchRuns, remove: removeRun } = useSopRuns(selectedSopId);

    const editorVisible = ref(false);
    const editingSop = ref(null);
    const startVisible = ref(false);
    const runDrawerVisible = ref(false);
    const activeRunId = ref('');

    watch(
      () => route.params.sopId,
      (sopId) => {
        selectedSopId.value = sopId || null;
      },
    );

    watch(
      () => [loading.value, sops.value],
      ([isLoading, list]) => {
        if (isLoading || list.length === 0) return;
        if (selectedSopId.value && list.some((sop) => sop.id === selectedSopId.value)) return;
        const first = list[0].id;
        selectedSopId.value = first;
        router.replace({ name: 'sop-detail', params: { sopId: first } });
      },
      { immediate: true },
    );

    function selectSop(sop) {
      selectedSopId.value = sop.id;
      router.push({ name: 'sop-detail', params: { sopId: sop.id } });
    }

    function openCreate() {
      editingSop.value = null;
      editorVisible.value = true;
    }

    function openEdit() {
      editingSop.value = selectedSop.value;
      editorVisible.value = true;
    }

    async function handleSaved(sopId) {
      await refetch();
      if (!sopId) return;
      selectedSopId.value = sopId;
      router.push({ name: 'sop-detail', params: { sopId } });
    }

    function openStart() {
      if (selectedSop.value) startVisible.value = true;
    }

    function handleStarted(run) {
      startVisible.value = false;
      refetchRuns();
      if (run?.id) {
        activeRunId.value = run.id;
        runDrawerVisible.value = true;
      }
    }

    function openRun(run) {
      activeRunId.value = run.id;
      runDrawerVisible.value = true;
    }

    async function handleDeleteRun(run) {
      await confirmDialog({
        message: '确定删除这次运行吗？它创建的会话与工作区会一并删除，不可恢复。',
        onSubmit: async () => {
          await removeRun(run.id);
          if (activeRunId.value === run.id) runDrawerVisible.value = false;
        },
      });
    }

    async function handleRemoveSop() {
      const sop = selectedSop.value;
      if (!sop) return;
      await confirmDialog({
        message: `确定删除流程「${sop.data.name}」吗？它的全部运行会一并删除，不可恢复。`,
        onSubmit: async () => {
          await remove(sop.id);
          const next = sops.value[0];
          if (next) {
            selectedSopId.value = next.id;
            router.replace({ name: 'sop-detail', params: { sopId: next.id } });
          } else {
            selectedSopId.value = null;
            router.replace({ name: 'sop' });
          }
        },
      });
    }

    function handleOpenSession(entry) {
      if (!entry?.agent_id || !entry?.session_id) return;
      router.push({
        name: 'chat',
        query: { agentId: entry.agent_id, sessionId: entry.session_id },
      });
    }

    return {
      sops,
      loading,
      error,
      refetch,
      agents,
      selectedSopId,
      selectedSop,
      runs,
      runsLoading,
      refetchRuns,
      editorVisible,
      editingSop,
      startVisible,
      runDrawerVisible,
      activeRunId,
      selectSop,
      openCreate,
      openEdit,
      handleSaved,
      openStart,
      handleStarted,
      openRun,
      handleDeleteRun,
      handleRemoveSop,
      handleOpenSession,
    };
  },
});
</script>
