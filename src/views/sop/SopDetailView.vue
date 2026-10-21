<template>
  <div class="tw-flex tw-size-full tw-flex-col tw-p-2">
    <main
      class="tw-shadow-panel tw-flex tw-min-h-0 tw-flex-1 tw-flex-col tw-overflow-hidden tw-rounded-22px tw-bg-card"
    >
      <header class="tw-flex tw-shrink-0 tw-items-start tw-justify-between tw-gap-4 tw-px-5 tw-py-3">
        <div class="tw-flex tw-min-w-0 tw-flex-1 tw-items-start tw-gap-1">
          <el-button
            type="text"
            size="mini"
            title="返回流程列表"
            class="tw-shrink-0 tw-p-1"
            @click="goBack"
          >
            <Icon
              icon="lucide:arrow-left"
              class="tw-h-4 tw-w-4"
            />
          </el-button>
          <div class="tw-flex tw-min-w-0 tw-flex-col tw-gap-0.5 tw-pl-1">
            <div class="tw-flex tw-items-center tw-gap-2">
              <span class="tw-truncate tw-text-lg tw-font-medium">{{ sop?.data.name || '流程详情' }}</span>
              <span
                v-if="sop"
                class="tw-shrink-0 tw-rounded-md tw-border tw-border-border tw-bg-secondary tw-px-1.5 tw-py-0.5 tw-text-10px"
              >
                {{ grainLabel }}
              </span>
            </div>
            <p
              v-if="sop?.data.description"
              class="tw-truncate tw-text-sm tw-text-muted-foreground"
            >
              {{ sop.data.description }}
            </p>
          </div>
        </div>

        <div
          v-if="sop"
          class="tw-flex tw-shrink-0 tw-items-center tw-gap-1"
        >
          <el-button
            type="text"
            size="small"
            title="发起运行"
            class="tw-p-1"
            @click="startVisible = true"
          >
            <Icon
              icon="lucide:play"
              class="tw-h-4 tw-w-4"
            />
          </el-button>
          <el-button
            type="text"
            size="small"
            title="编辑流程"
            class="tw-p-1"
            style="color: var(--as-muted-foreground)"
            @click="editorVisible = true"
          >
            <Icon
              icon="lucide:pencil"
              class="tw-h-4 tw-w-4"
            />
          </el-button>
          <el-button
            type="text"
            size="small"
            title="删除流程"
            class="run-delete-btn tw-p-1"
            @click="handleRemoveSop"
          >
            <Icon
              icon="lucide:trash-2"
              class="tw-h-4 tw-w-4"
            />
          </el-button>
        </div>
      </header>

      <div class="tw-h-px tw-shrink-0 tw-bg-border"></div>

      <div
        v-if="loading && !sop"
        class="tw-flex tw-flex-1 tw-items-center tw-justify-center"
      >
        <Spinner class="tw-h-6 tw-w-6" />
      </div>

      <div
        v-else-if="error && !sop"
        class="tw-flex tw-flex-1 tw-flex-col tw-items-center tw-justify-center tw-gap-2 tw-px-6 tw-text-center"
      >
        <p class="tw-text-sm tw-text-destructive">{{ error }}</p>
        <el-button
          size="small"
          @click="loadSop"
          >重试</el-button
        >
      </div>

      <div
        v-else-if="sop"
        class="tw-flex tw-min-h-0 tw-flex-1"
      >
        <section class="tw-flex tw-w-64 tw-shrink-0 tw-flex-col tw-overflow-hidden xl:tw-w-96">
          <div class="tw-flex tw-h-11 tw-shrink-0 tw-items-center tw-justify-between tw-gap-2 tw-px-5">
            <span class="tw-text-sm tw-font-semibold">步骤定义</span>
            <span class="tw-text-10px tw-text-muted-foreground">{{ steps.length }} 个步骤</span>
          </div>
          <Scrollbar
            class="tw-min-h-0 tw-flex-1 tw-overflow-x-hidden"
            wrapClass="tw-overflow-x-hidden tw-px-5 tw-pb-5"
          >
            <div class="tw-space-y-2">
              <div
                v-for="(step, index) in steps"
                :key="index"
                class="tw-flex tw-gap-3 tw-rounded-lg tw-border tw-border-border tw-p-3"
              >
                <div
                  class="tw-flex tw-h-6 tw-w-6 tw-shrink-0 tw-items-center tw-justify-center tw-rounded-full tw-bg-muted tw-text-xs tw-font-medium"
                >
                  {{ index + 1 }}
                </div>
                <div class="tw-flex tw-min-w-0 tw-flex-1 tw-flex-col tw-gap-1">
                  <div class="tw-text-sm tw-font-medium">{{ step.subject }}</div>
                  <div
                    class="tw-line-clamp-3 tw-text-xs tw-text-muted-foreground"
                    :title="step.description"
                  >
                    {{ step.description }}
                  </div>
                  <div class="tw-mt-1 tw-flex tw-flex-wrap tw-gap-x-4 tw-gap-y-1 tw-text-xs tw-text-muted-foreground">
                    <span>执行者：{{ agentDisplayName(agents, step.executor?.agent_id) }}</span>
                    <span>验证者：{{ verifierLabel(agents, step) }}</span>
                    <span v-if="step.verifier">最多尝试：{{ step.max_attempts }} 次</span>
                  </div>
                </div>
              </div>
            </div>
          </Scrollbar>
        </section>

        <div class="tw-w-px tw-shrink-0 tw-self-stretch tw-bg-border"></div>

        <section class="tw-flex tw-min-w-0 tw-flex-1 tw-flex-col">
          <div class="tw-flex tw-h-11 tw-shrink-0 tw-items-center tw-justify-between tw-gap-2 tw-px-5">
            <span class="tw-text-sm tw-font-semibold">运行记录</span>
            <div class="tw-flex tw-items-center tw-gap-2">
              <span class="tw-text-10px tw-text-muted-foreground">共 {{ total }} 条</span>
              <el-button
                type="text"
                size="mini"
                title="刷新运行记录"
                :disabled="runsLoading"
                @click="refetchRuns"
              >
                <Icon
                  icon="lucide:refresh-cw"
                  class="tw-h-3.5 tw-w-3.5"
                  :class="{ 'tw-animate-spin': runsLoading }"
                />
              </el-button>
            </div>
          </div>

          <el-form
            class="sop-run-filters tw-flex tw-shrink-0 tw-flex-wrap tw-items-center tw-gap-2 tw-px-5 tw-pb-3"
            :inline="true"
            @submit.native.prevent="query"
          >
            <el-form-item>
              <el-input
                v-model="filters.title"
                size="small"
                clearable
                placeholder="搜索标题"
                prefix-icon="el-icon-search"
                class="tw-w-32"
              />
            </el-form-item>
            <el-form-item>
              <el-select
                v-model="filters.status"
                size="small"
                clearable
                placeholder="全部状态"
                class="tw-w-32"
              >
                <el-option
                  v-for="option in statusOptions"
                  :key="option.value"
                  :label="option.label"
                  :value="option.value"
                />
              </el-select>
            </el-form-item>
            <el-form-item>
              <el-date-picker
                v-model="filters.date"
                size="small"
                type="date"
                placeholder="按日期筛选"
                value-format="yyyy-MM-dd"
                style="width: 150px"
              />
            </el-form-item>
            <el-form-item class="tw-ml-auto">
              <el-button
                size="small"
                type="primary"
                native-type="submit"
                >查询</el-button
              >
              <el-button
                size="small"
                @click="resetFilters"
                >重置</el-button
              >
            </el-form-item>
          </el-form>

          <div class="tw-min-h-0 tw-flex-1 tw-px-5">
            <el-table
              v-loading="runsLoading"
              :data="rows"
              height="100%"
              max-height="100%"
              class="sop-run-table"
              :row-class-name="runRowClass"
              :default-sort="defaultSort"
              @sort-change="handleSortChange"
              @row-click="openRun"
            >
              <el-table-column
                label="状态"
                prop="phase"
                sortable="custom"
                width="120"
              >
                <template #default="{ row }">
                  <StatusBadge :status="row.state?.phase || 'pending'" />
                </template>
              </el-table-column>
              <el-table-column
                label="运行"
                min-width="120"
              >
                <template #default="{ row }">
                  <div class="tw-flex tw-min-w-0 tw-flex-col tw-gap-0.5 tw-py-1">
                    <span
                      class="tw-truncate tw-text-sm"
                      :title="runInputText(row)"
                    >
                      {{ runInputText(row) || '（无起步输入）' }}
                    </span>
                    <span class="tw-truncate tw-text-10px tw-text-muted-foreground">
                      {{ currentStepLabel(row) }}
                    </span>
                  </div>
                </template>
              </el-table-column>
              <el-table-column
                label="日期"
                prop="created_at"
                sortable="custom"
                width="96"
              >
                <template #default="{ row }">
                  <span
                    class="tw-text-xs tw-text-muted-foreground"
                    :title="formatTime(row.created_at)"
                  >
                    {{ formatShortTime(row.created_at) }}
                  </span>
                </template>
              </el-table-column>
              <el-table-column
                width="100"
                align="right"
                label="操作"
              >
                <template #default="{ row }">
                  <el-button
                    type="text"
                    size="mini"
                    title="删除运行"
                    class="run-delete-btn"
                    @click.stop="handleDeleteRun(row)"
                  >
                    <Icon
                      icon="lucide:trash-2"
                      class="tw-h-3.5 tw-w-3.5"
                    />
                  </el-button>
                </template>
              </el-table-column>
              <!-- 为 el-table 的覆盖式纵向滚动条预留位置，避免压住操作列 -->
              <el-table-column width="12" />
              <template #empty>
                <div class="tw-py-8 tw-text-center tw-text-sm tw-text-muted-foreground">
                  {{ runs.length === 0 ? '暂无运行' : '没有匹配的运行记录' }}
                </div>
              </template>
            </el-table>
          </div>

          <div
            v-if="total > 0"
            class="tw-flex tw-shrink-0 tw-items-center tw-justify-end tw-border-t tw-border-border tw-px-5 tw-py-2"
          >
            <el-pagination
              small
              layout="sizes, prev, pager, next"
              :page-sizes="[10, 25, 50]"
              :current-page="page"
              :page-size="pageSize"
              :total="total"
              @size-change="setPageSize"
              @current-change="setPage"
            />
          </div>
        </section>
      </div>
    </main>

    <SopEditorDialog
      v-if="sop"
      :visible.sync="editorVisible"
      :sop="sop"
      :agents="agents"
      @saved="handleSaved"
    />

    <StartRunDialog
      :visible.sync="startVisible"
      :sop="sop"
      @started="handleStarted"
    />
  </div>
</template>

<script>
import { defineComponent, ref, computed, watch } from '@/composables/vue';
import { useRoute, useRouter } from '@/composables/vue-router';
import { Icon } from '@/components/ui/Icon';
import Spinner from '@/components/ui/Spinner.vue';
import StatusBadge from '@/components/badge/StatusBadge.vue';
import Scrollbar from '@/components/ui/Scrollbar.vue';
import { sopApi } from '@/api';
import { confirmDialog } from '@/utils/common';
import { useAgents } from '@/composables/useAgents';
import { useSopRuns } from '@/composables/useSopRuns';
import { useRouteQueryState } from '@/composables/useRouteQueryState';
import SopEditorDialog from '@/components/dialog/SopEditorDialog.vue';
import StartRunDialog from '@/components/dialog/StartRunDialog.vue';
import {
  SOP_PHASE_LABELS,
  SOP_WORKSPACE_GRAIN_LABELS,
  agentDisplayName,
  getCurrentStepIndex,
  parseRunListQuery,
  runInputText,
  verifierLabel,
} from './sop-utils';

const RUN_PAGE_SIZE = 10;

// 查询条件同步到 URL 时的默认值：等于默认值的字段不写入 query。
const RUN_QUERY_DEFAULTS = {
  title: '',
  status: '',
  date: '',
  sort: 'created_at',
  order: 'descending',
  page: 1,
  page_size: RUN_PAGE_SIZE,
};

export default defineComponent({
  name: 'SopDetailView',
  components: { Icon, Spinner, StatusBadge, Scrollbar, SopEditorDialog, StartRunDialog },
  setup() {
    const route = useRoute();
    const router = useRouter();

    const sopId = computed(() => route.params.sopId || '');
    const sop = ref(null);
    const loading = ref(false);
    const error = ref('');
    let requestSeq = 0;

    const { agents } = useAgents();
    const initialQuery = parseRunListQuery(route.query);

    const {
      runs,
      rows,
      total,
      page,
      pageSize,
      filters,
      sort,
      queryState,
      loading: runsLoading,
      refetch: refetchRuns,
      remove: removeRun,
      query,
      resetFilters,
      setPage,
      setPageSize,
      setSort,
    } = useSopRuns(sopId, initialQuery);

    const editorVisible = ref(false);
    const startVisible = ref(false);

    const steps = computed(() => sop.value?.data?.steps ?? []);
    const grainLabel = computed(
      () => SOP_WORKSPACE_GRAIN_LABELS[sop.value?.data?.workspace_grain] || '整个运行共用一个工作区',
    );

    const statusOptions = Object.entries(SOP_PHASE_LABELS).map(([value, label]) => ({ value, label }));
    const defaultSort = computed(() => ({ prop: sort.value.prop, order: sort.value.order }));

    // 已生效的条件与路由 query 双向同步，返回或刷新本页时原样恢复。
    useRouteQueryState(queryState, {
      defaults: RUN_QUERY_DEFAULTS,
      parse: (raw) => {
        const parsed = parseRunListQuery(raw);
        return {
          ...parsed.filters,
          sort: parsed.sort.prop,
          order: parsed.sort.order,
          page: parsed.page,
          page_size: parsed.pageSize,
        };
      },
    });

    async function loadSop() {
      const currentId = sopId.value;
      if (!currentId) return;
      const seq = ++requestSeq;
      loading.value = true;
      error.value = '';
      try {
        const res = await sopApi.get(currentId);
        if (seq !== requestSeq) return;
        sop.value = res;
      } catch (e) {
        if (seq === requestSeq) error.value = e?.message || String(e);
      } finally {
        if (seq === requestSeq) loading.value = false;
      }
    }

    watch(
      sopId,
      (value) => {
        sop.value = null;
        if (value) loadSop();
      },
      { immediate: true },
    );

    function goBack() {
      router.push({ name: 'sop' });
    }

    function openRun(run) {
      // 列表的筛选、排序、页码只留在本页 URL 上，返回时由历史后退原样恢复。
      router.push({ name: 'sop-run', params: { sopId: sopId.value, runId: run.id } });
    }

    function handleSortChange({ prop, order }) {
      setSort({ prop, order });
    }

    function runRowClass() {
      return 'tw-group';
    }

    function formatTime(value) {
      return value ? new Date(value).toLocaleString() : '—';
    }

    function formatShortTime(value) {
      if (!value) return '—';
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return '—';
      const part = (number) => String(number).padStart(2, '0');
      return `${part(date.getMonth() + 1)}-${part(date.getDate())} ${part(date.getHours())}:${part(date.getMinutes())}`;
    }

    function currentStepLabel(run) {
      const index = getCurrentStepIndex(run);
      const step = run.definition?.steps?.[index];
      if (!step) return '—';
      return `第 ${index + 1} 步 · ${step.subject}`;
    }

    async function handleStarted(run) {
      startVisible.value = false;
      await refetchRuns();
      if (run?.id) openRun(run);
    }

    async function handleSaved() {
      await loadSop();
      await refetchRuns();
    }

    async function handleDeleteRun(run) {
      await confirmDialog({
        message: '确定删除这次运行吗？它创建的会话与工作区会一并删除，不可恢复。',
        onSubmit: () => removeRun(run.id),
      });
    }

    async function handleRemoveSop() {
      if (!sop.value) return;
      await confirmDialog({
        message: `确定删除流程「${sop.value.data.name}」吗？它的全部运行会一并删除，不可恢复。`,
        onSubmit: async () => {
          await sopApi.remove(sop.value.id);
          router.replace({ name: 'sop' });
        },
      });
    }

    return {
      sop,
      loading,
      error,
      steps,
      grainLabel,
      agents,
      runs,
      runsLoading,
      refetchRuns,
      rows,
      total,
      page,
      pageSize,
      filters,
      statusOptions,
      defaultSort,
      query,
      resetFilters,
      setPage,
      setPageSize,
      handleSortChange,
      runRowClass,
      editorVisible,
      startVisible,
      loadSop,
      goBack,
      openRun,
      formatTime,
      formatShortTime,
      currentStepLabel,
      runInputText,
      handleStarted,
      handleSaved,
      handleDeleteRun,
      handleRemoveSop,
      agentDisplayName,
      verifierLabel,
    };
  },
});
</script>
