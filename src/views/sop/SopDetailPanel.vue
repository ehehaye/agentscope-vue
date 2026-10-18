<template>
  <div class="tw-flex tw-h-full tw-flex-col">
    <div class="tw-flex tw-shrink-0 tw-items-start tw-justify-between tw-gap-4 tw-p-5 tw-pb-4">
      <div class="tw-flex tw-min-w-0 tw-flex-col tw-gap-1">
        <div class="tw-flex tw-items-center tw-gap-2">
          <span class="tw-truncate tw-text-lg tw-font-medium">{{ sop.data.name }}</span>
          <span class="tw-rounded-md tw-border tw-border-border tw-bg-secondary tw-px-1.5 tw-py-0.5 tw-text-10px">
            {{ grainLabel }}
          </span>
        </div>
        <p
          v-if="sop.data.description"
          class="tw-text-sm tw-text-muted-foreground"
        >
          {{ sop.data.description }}
        </p>
      </div>
      <div class="tw-flex tw-shrink-0 tw-items-center tw-gap-2">
        <el-button
          size="small"
          type="primary"
          @click="$emit('start')"
        >
          <Icon
            icon="lucide:play"
            class="tw-mr-1 tw-h-3.5 tw-w-3.5"
          />
          运行
        </el-button>
        <el-button
          size="small"
          @click="$emit('edit')"
        >
          <Icon
            icon="lucide:pencil"
            class="tw-mr-1 tw-h-3.5 tw-w-3.5"
          />
          编辑
        </el-button>
        <el-button
          size="small"
          type="danger"
          @click="$emit('remove')"
        >
          <Icon
            icon="lucide:trash-2"
            class="tw-mr-1 tw-h-3.5 tw-w-3.5"
          />
          删除
        </el-button>
      </div>
    </div>

    <el-divider class="tw-shrink-0 tw-m-0" />

    <div class="tw-min-h-0 tw-flex-1 tw-overflow-y-auto tw-p-5">
      <div class="tw-flex tw-flex-col tw-gap-6">
        <section>
          <div class="tw-mb-2 tw-text-sm tw-font-semibold">步骤定义</div>
          <div class="tw-space-y-2">
            <div
              v-for="(step, index) in sop.data.steps"
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
                <div class="tw-text-xs tw-text-muted-foreground">{{ step.description }}</div>
                <div class="tw-mt-1 tw-flex tw-flex-wrap tw-gap-x-4 tw-gap-y-1 tw-text-xs tw-text-muted-foreground">
                  <span>执行者：{{ agentName(step.executor?.agent_id) }}（{{ step.executor?.session_key }}）</span>
                  <span>验证者：{{ verifierLabel(step) }}</span>
                  <span>最多尝试：{{ step.max_attempts }} 次</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section>
          <div class="tw-mb-2 tw-flex tw-items-center tw-justify-between">
            <div class="tw-text-sm tw-font-semibold">运行记录</div>
            <el-button
              type="text"
              size="mini"
              :loading="runsLoading"
              @click="$emit('refresh-runs')"
            >
              <Icon
                icon="lucide:refresh-cw"
                class="tw-mr-1 tw-h-3.5 tw-w-3.5"
              />
              刷新
            </el-button>
          </div>

          <div
            v-if="runsLoading && runs.length === 0"
            class="tw-flex tw-items-center tw-justify-center tw-py-8"
          >
            <Spinner class="tw-h-5 tw-w-5" />
          </div>
          <div
            v-else-if="runs.length === 0"
            class="tw-rounded-lg tw-border tw-border-dashed tw-border-border tw-py-8 tw-text-center tw-text-sm tw-text-muted-foreground"
          >
            暂无运行
          </div>
          <div
            v-else
            class="tw-space-y-1"
          >
            <div
              v-for="run in runs"
              :key="run.id"
              class="tw-group tw-flex tw-cursor-pointer tw-items-center tw-gap-3 tw-rounded-md tw-px-2 tw-py-2 tw-text-sm tw-transition-colors hover:tw-bg-muted"
              @click="$emit('open-run', run)"
            >
              <StatusBadge :status="run.state?.phase || 'pending'" />
              <span class="tw-shrink-0 tw-text-xs tw-text-muted-foreground">{{ formatTime(run.created_at) }}</span>
              <span class="tw-min-w-0 tw-flex-1 tw-truncate tw-text-xs tw-text-muted-foreground">
                {{ currentStepLabel(run) }}
              </span>
              <el-button
                type="text"
                size="mini"
                class="tw-opacity-0 group-hover:tw-opacity-100"
                @click.stop="$emit('delete-run', run)"
              >
                <Icon
                  icon="lucide:trash-2"
                  class="tw-h-3.5 tw-w-3.5"
                />
              </el-button>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script>
import { defineComponent, computed } from '@/composables/vue';
import { Icon } from '@/components/ui/Icon';
import Spinner from '@/components/ui/Spinner.vue';
import StatusBadge from '@/components/badge/StatusBadge.vue';
import { SOP_WORKSPACE_GRAIN_LABELS, getCurrentStepIndex } from './sop-utils';

export default defineComponent({
  name: 'SopDetailPanel',
  components: { Icon, Spinner, StatusBadge },
  props: {
    sop: { type: Object, required: true },
    runs: { type: Array, default: () => [] },
    runsLoading: { type: Boolean, default: false },
    agents: { type: Array, default: () => [] },
  },
  setup(props) {
    const grainLabel = computed(
      () => SOP_WORKSPACE_GRAIN_LABELS[props.sop.data.workspace_grain] || '整个运行共用一个工作区',
    );

    function agentName(agentId) {
      const agent = props.agents.find((item) => item.id === agentId);
      return agent?.data?.name || agentId || '—';
    }

    function verifierLabel(step) {
      if (!step.verifier) return '无需验收';
      if (step.verifier.type === 'human') return '人工验收';
      return `智能体验收 · ${agentName(step.verifier.agent?.agent_id)}`;
    }

    function formatTime(value) {
      return value ? new Date(value).toLocaleString() : '—';
    }

    function currentStepLabel(run) {
      const index = getCurrentStepIndex(run);
      const step = run.definition?.steps?.[index];
      if (!step) return '—';
      return `第 ${index + 1} 步 · ${step.subject}`;
    }

    return {
      grainLabel,
      agentName,
      verifierLabel,
      formatTime,
      currentStepLabel,
    };
  },
});
</script>
