<template>
  <div class="tw-min-h-0 tw-flex-1 tw-px-5">
    <el-table
      v-loading="loading"
      :data="rows"
      height="100%"
      max-height="100%"
      class="sop-run-table"
      row-class-name="tw-group"
      :default-sort="defaultSort"
      @sort-change="$emit('sort-change', $event)"
      @row-click="$emit('row-click', $event)"
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
            @click.stop="$emit('delete', row)"
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
          {{ emptyText }}
        </div>
      </template>
    </el-table>
  </div>
</template>

<script>
import { defineComponent } from '@/composables/vue';
import Icon from '@/components/ui/Icon';
import StatusBadge from '@/components/badge/StatusBadge.vue';
import { getCurrentStepIndex, runInputText } from '@/utils/sop';

export default defineComponent({
  name: 'SopRunTable',
  components: { Icon, StatusBadge },
  props: {
    rows: { type: Array, default: () => [] },
    loading: { type: Boolean, default: false },
    defaultSort: { type: Object, default: null },
    emptyText: { type: String, default: '暂无运行' },
  },
  emits: ['row-click', 'sort-change', 'delete'],
  setup() {
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

    return { runInputText, formatTime, formatShortTime, currentStepLabel };
  },
});
</script>
