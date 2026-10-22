<template>
  <div class="tw-flex tw-size-full tw-flex-col tw-p-2">
    <main
      class="tw-shadow-panel tw-flex tw-min-h-0 tw-flex-1 tw-flex-col tw-overflow-hidden tw-rounded-22px tw-bg-card"
    >
      <div class="tw-flex tw-shrink-0 tw-items-center tw-justify-between tw-gap-4 tw-px-6 tw-py-5">
        <div class="tw-flex tw-flex-col tw-gap-y-1">
          <div class="tw-text-xl tw-font-medium tw-tracking-neg-0_02em">SOP</div>
          <div class="tw-text-xs tw-text-muted-foreground">保存标准作业流程，发起运行并跟踪步骤。</div>
        </div>
        <el-button
          size="small"
          type="text"
          @click="openCreate"
        >
          <Icon
            icon="lucide:plus"
            class="tw-mr-1 tw-h-3.5 tw-w-3.5"
          />
        </el-button>
      </div>

      <div class="tw-h-px tw-shrink-0 tw-bg-border"></div>

      <div class="tw-min-h-0 tw-flex-1 tw-overflow-y-auto tw-p-6">
        <div
          v-if="loading && sops.length === 0"
          class="tw-flex tw-h-full tw-flex-col tw-items-center tw-justify-center"
        >
          <Spinner class="tw-h-6 tw-w-6" />
          <p class="tw-mt-2 tw-text-xs tw-text-muted-foreground">加载中…</p>
        </div>

        <PanelEmpty
          v-else-if="error"
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
          class="tw-grid tw-grid-cols-1 tw-gap-3 lg:tw-grid-cols-2 xl:tw-grid-cols-3"
        >
          <SopCard
            v-for="sop in sops"
            :key="sop.id"
            :sop="sop"
            @open="openSop"
          />
        </div>
      </div>
    </main>

    <SopEditorDialog
      :visible.sync="editorVisible"
      :sop="null"
      :agents="agents"
      @saved="handleSaved"
    />
  </div>
</template>

<script>
import { defineComponent, ref } from '@/composables/vue';
import { useRouter } from '@/composables/vue-router';
import Icon from '@/components/ui/Icon';
import Spinner from '@/components/ui/Spinner.vue';
import PanelEmpty from '@/components/panel/PanelEmpty.vue';
import SopEditorDialog from '@/components/dialog/SopEditorDialog.vue';
import SopCard from '@/components/sop/SopCard.vue';
import { useSops } from '@/composables/useSops';
import { useAgents } from '@/composables/useAgents';

export default defineComponent({
  name: 'SopListView',
  components: { Icon, Spinner, PanelEmpty, SopEditorDialog, SopCard },
  setup() {
    const router = useRouter();
    const { sops, loading, error, refetch } = useSops();
    const { agents } = useAgents();

    const editorVisible = ref(false);

    function openSop(sop) {
      router.push({ name: 'sop-detail', params: { sopId: sop.id } });
    }

    function openCreate() {
      editorVisible.value = true;
    }

    async function handleSaved(sopId) {
      await refetch();
      if (sopId) router.push({ name: 'sop-detail', params: { sopId } });
    }

    return {
      sops,
      loading,
      error,
      refetch,
      agents,
      editorVisible,
      openSop,
      openCreate,
      handleSaved,
    };
  },
});
</script>
