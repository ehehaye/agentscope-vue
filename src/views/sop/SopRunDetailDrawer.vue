<template>
  <el-drawer
    :visible.sync="dialogVisible"
    size="36rem"
    direction="rtl"
    title="运行详情"
    @close="$emit('update:visible', false)"
  >
    <div
      v-if="loading && !run"
      class="tw-flex tw-h-full tw-items-center tw-justify-center"
    >
      <Spinner class="tw-h-6 tw-w-6" />
    </div>

    <div
      v-else-if="error && !run"
      class="tw-flex tw-h-full tw-flex-col tw-items-center tw-justify-center tw-gap-2 tw-px-6 tw-text-center"
    >
      <p class="tw-text-sm tw-text-destructive">{{ error }}</p>
      <el-button
        size="small"
        @click="refresh"
        >重试</el-button
      >
    </div>

    <div
      v-else-if="run"
      class="tw-flex tw-h-full tw-flex-col tw-gap-4 tw-overflow-y-auto tw-p-4"
    >
      <div class="tw-flex tw-items-start tw-justify-between tw-gap-3">
        <div class="tw-flex tw-min-w-0 tw-flex-col tw-gap-1">
          <div class="tw-flex tw-items-center tw-gap-2">
            <StatusBadge :status="run.state?.phase || 'pending'" />
            <span class="tw-truncate tw-text-sm tw-font-medium">{{ run.definition?.name }}</span>
          </div>
          <span class="tw-text-xs tw-text-muted-foreground">
            创建于 {{ formatTime(run.created_at) }} · 更新于 {{ formatTime(run.updated_at) }}
          </span>
        </div>
        <div class="tw-flex tw-shrink-0 tw-items-center tw-gap-1">
          <el-button
            type="text"
            size="mini"
            :loading="loading"
            @click="refresh"
          >
            <Icon
              icon="lucide:refresh-cw"
              class="tw-h-3.5 tw-w-3.5"
            />
          </el-button>
          <el-button
            type="text"
            size="mini"
            @click="handleDelete"
          >
            <Icon
              icon="lucide:trash-2"
              class="tw-h-3.5 tw-w-3.5"
            />
          </el-button>
        </div>
      </div>

      <p
        v-if="error"
        class="tw-whitespace-pre-wrap tw-text-xs tw-text-destructive"
      >
        {{ error }}
      </p>

      <div v-if="inputsText">
        <div class="tw-mb-1 tw-text-sm tw-font-semibold">起步输入</div>
        <div class="tw-whitespace-pre-wrap tw-rounded-md tw-bg-muted tw-p-2 tw-text-xs">
          {{ inputsText }}
        </div>
      </div>

      <div>
        <div class="tw-mb-2 tw-text-sm tw-font-semibold">步骤进度</div>
        <div class="tw-space-y-2">
          <div
            v-for="item in stepItems"
            :key="item.index"
            class="tw-rounded-lg tw-border tw-border-border tw-p-3"
          >
            <div class="tw-flex tw-items-center tw-justify-between tw-gap-2">
              <div class="tw-flex tw-min-w-0 tw-items-center tw-gap-2">
                <span
                  class="tw-flex tw-h-5 tw-w-5 tw-shrink-0 tw-items-center tw-justify-center tw-rounded-full tw-bg-muted tw-text-10px"
                >
                  {{ item.index + 1 }}
                </span>
                <span class="tw-truncate tw-text-sm tw-font-medium">{{ item.definition.subject }}</span>
              </div>
              <StatusBadge :status="item.state.phase || 'pending'" />
            </div>

            <div class="tw-mt-1 tw-text-xs tw-text-muted-foreground">{{ item.definition.description }}</div>
            <div class="tw-mt-1 tw-flex tw-flex-wrap tw-gap-x-3 tw-gap-y-1 tw-text-xs tw-text-muted-foreground">
              <span>执行者：{{ agentName(item.definition.executor?.agent_id) }}</span>
              <span>验证者：{{ verifierLabel(item.definition) }}</span>
            </div>

            <div
              v-if="submissionText(item)"
              class="tw-mt-2"
            >
              <div class="tw-mb-1 tw-text-xs tw-font-medium">交付内容</div>
              <div class="tw-whitespace-pre-wrap tw-rounded-md tw-bg-muted tw-p-2 tw-text-xs">
                {{ submissionText(item) }}
              </div>
            </div>

            <div
              v-if="item.state.verifications?.length"
              class="tw-mt-2 tw-space-y-1"
            >
              <div
                v-for="(verification, index) in item.state.verifications"
                :key="index"
                class="tw-text-xs"
              >
                <span :class="verification.passed ? 'tw-text-green-600' : 'tw-text-red-600'">
                  {{ verification.passed ? '通过' : '驳回' }}
                </span>
                <span class="tw-ml-2 tw-text-muted-foreground">{{ verification.verifier }}</span>
                <span
                  v-if="verification.message"
                  class="tw-ml-2 tw-whitespace-pre-wrap"
                  >{{ verification.message }}</span
                >
              </div>
            </div>

            <div
              v-if="item.index === awaitingHumanIndex"
              class="tw-mt-2 tw-rounded-md tw-border tw-border-yellow-200 tw-bg-yellow-50 tw-p-2"
            >
              <div class="tw-text-xs tw-font-medium">人工验收</div>
              <p class="tw-mt-0.5 tw-text-xs tw-text-muted-foreground">
                {{ item.definition.verifier?.question }}
              </p>
              <el-input
                v-model="verdictMessage"
                type="textarea"
                :rows="2"
                placeholder="驳回原因（通过时可留空）"
                class="tw-mt-2"
              />
              <div class="tw-mt-2 tw-flex tw-gap-2">
                <el-button
                  size="mini"
                  type="primary"
                  :loading="submittingVerdict"
                  @click="handleVerdict(true)"
                >
                  通过
                </el-button>
                <el-button
                  size="mini"
                  type="danger"
                  :loading="submittingVerdict"
                  @click="handleVerdict(false)"
                >
                  驳回
                </el-button>
              </div>
              <p
                v-if="verdictError"
                class="tw-mt-1 tw-text-xs tw-text-destructive"
              >
                {{ verdictError }}
              </p>
            </div>

            <div
              v-else-if="item.state.phase === 'awaiting'"
              class="tw-mt-2 tw-text-xs tw-text-muted-foreground"
            >
              等待工具授权，请打开下方会话处理。
            </div>
          </div>
        </div>
      </div>

      <div>
        <div class="tw-mb-2 tw-text-sm tw-font-semibold">会话</div>
        <div
          v-if="sessionEntries.length === 0"
          class="tw-text-xs tw-text-muted-foreground"
        >
          暂无会话
        </div>
        <div
          v-else
          class="tw-space-y-1"
        >
          <div
            v-for="entry in sessionEntries"
            :key="entry.session_key"
            class="tw-flex tw-items-center tw-justify-between tw-gap-2 tw-rounded-md tw-border tw-border-border tw-px-2 tw-py-2"
          >
            <div class="tw-flex tw-min-w-0 tw-flex-col tw-gap-0.5">
              <div class="tw-flex tw-items-center tw-gap-2">
                <span class="tw-font-mono tw-text-xs tw-font-medium">{{ entry.session_key }}</span>
                <span class="tw-text-xs tw-text-muted-foreground">{{ agentName(entry.agent_id) }}</span>
                <span class="tw-text-10px tw-text-muted-foreground">{{ entry.roles.join(' / ') }}</span>
              </div>
              <span class="tw-truncate tw-font-mono tw-text-10px tw-text-muted-foreground">
                {{ entry.session_id || '会话尚未创建' }}
              </span>
            </div>
            <el-button
              size="mini"
              :disabled="!entry.session_id || !entry.agent_id"
              @click="openSession(entry)"
            >
              打开会话
            </el-button>
          </div>
        </div>
      </div>
    </div>
  </el-drawer>
</template>

<script>
import { defineComponent, ref, computed, watch, onUnmounted } from '@/composables/vue';
import { Icon } from '@/components/ui/Icon';
import Spinner from '@/components/ui/Spinner.vue';
import StatusBadge from '@/components/badge/StatusBadge.vue';
import { sopApi } from '@/api';
import { confirmDialog } from '@/utils/common';
import { collectRunSessions, flattenTextBlocks, getAwaitingHumanStepIndex } from './sop-utils';

const POLL_INTERVAL_MS = 2500;

export default defineComponent({
  name: 'SopRunDetailDrawer',
  components: { Icon, Spinner, StatusBadge },
  props: {
    visible: { type: Boolean, default: false },
    sopRunId: { type: String, default: '' },
    agents: { type: Array, default: () => [] },
  },
  setup(props, { emit }) {
    const run = ref(null);
    const loading = ref(false);
    const error = ref('');
    const verdictMessage = ref('');
    const verdictError = ref('');
    const submittingVerdict = ref(false);

    let pollTimer = null;
    let requestSeq = 0;

    const dialogVisible = computed({
      get: () => props.visible,
      set: (value) => emit('update:visible', value),
    });

    const awaitingHumanIndex = computed(() => getAwaitingHumanStepIndex(run.value));

    const stepItems = computed(() =>
      (run.value?.definition?.steps ?? []).map((definition, index) => ({
        definition,
        index,
        state: run.value?.state?.steps?.[index] ?? {},
      })),
    );

    const sessionEntries = computed(() => collectRunSessions(run.value));

    const inputsText = computed(() => {
      const inputs = run.value?.state?.inputs ?? [];
      return inputs
        .map((msg) => flattenTextBlocks(msg.content))
        .filter(Boolean)
        .join('\n');
    });

    function agentName(agentId) {
      const agent = props.agents.find((item) => item.id === agentId);
      return agent?.data?.name || agentId || '—';
    }

    function verifierLabel(definition) {
      if (!definition.verifier) return '无需验收';
      if (definition.verifier.type === 'human') return '人工验收';
      return `智能体验收 · ${agentName(definition.verifier.agent?.agent_id)}`;
    }

    function formatTime(value) {
      return value ? new Date(value).toLocaleString() : '—';
    }

    function submissionText(item) {
      return flattenTextBlocks(item.state?.submission);
    }

    function clearTimer() {
      if (pollTimer) {
        clearTimeout(pollTimer);
        pollTimer = null;
      }
    }

    function shouldPoll() {
      return ['pending', 'running', 'awaiting'].includes(run.value?.state?.phase);
    }

    async function load({ silent = false } = {}) {
      const sopRunId = props.sopRunId;
      if (!sopRunId) return;
      const seq = ++requestSeq;
      if (!silent) loading.value = true;
      error.value = '';
      try {
        const res = await sopApi.getRun(sopRunId);
        if (seq !== requestSeq) return;
        const previousPhase = run.value?.state?.phase;
        run.value = res;
        if (previousPhase && previousPhase !== res?.state?.phase) emit('changed');
      } catch (e) {
        if (seq === requestSeq) error.value = e?.message || String(e);
      } finally {
        if (seq === requestSeq) loading.value = false;
      }
    }

    async function poll() {
      await load({ silent: run.value !== null });
      if (props.visible && props.sopRunId && shouldPoll()) {
        pollTimer = setTimeout(poll, POLL_INTERVAL_MS);
      }
    }

    function startPolling() {
      clearTimer();
      if (props.visible && props.sopRunId) poll();
    }

    async function refresh() {
      clearTimer();
      await load();
      if (props.visible && props.sopRunId && shouldPoll()) {
        pollTimer = setTimeout(poll, POLL_INTERVAL_MS);
      }
    }

    watch(
      () => [props.visible, props.sopRunId],
      ([visible, sopRunId], previous) => {
        const switched = !previous || previous[1] !== sopRunId;
        if (visible && sopRunId) {
          if (switched) {
            run.value = null;
            verdictMessage.value = '';
            verdictError.value = '';
          }
          startPolling();
        } else {
          clearTimer();
        }
      },
      { immediate: true },
    );

    onUnmounted(clearTimer);

    async function handleVerdict(passed) {
      if (awaitingHumanIndex.value < 0 || submittingVerdict.value) return;
      const message = verdictMessage.value.trim();
      if (!passed && !message) {
        verdictError.value = '驳回时必须填写原因';
        return;
      }
      verdictError.value = '';
      submittingVerdict.value = true;
      // 让仍在途中的轮询响应失效，避免用旧状态覆盖验收结果。
      requestSeq += 1;
      try {
        const updated = await sopApi.submitVerdict(run.value.id, {
          step_index: awaitingHumanIndex.value,
          passed,
          message,
        });
        run.value = updated;
        verdictMessage.value = '';
        emit('changed');
        if (shouldPoll()) {
          clearTimer();
          pollTimer = setTimeout(poll, POLL_INTERVAL_MS);
        }
      } catch (e) {
        verdictError.value = e?.message || String(e);
      } finally {
        submittingVerdict.value = false;
      }
    }

    async function handleDelete() {
      if (!run.value) return;
      await confirmDialog({
        message: '确定删除这次运行吗？它创建的会话与工作区会一并删除，不可恢复。',
        onSubmit: async () => {
          await sopApi.removeRun(run.value.id);
          emit('changed');
          dialogVisible.value = false;
        },
      });
    }

    function openSession(entry) {
      if (!entry.session_id || !entry.agent_id) return;
      dialogVisible.value = false;
      emit('open-session', entry);
    }

    return {
      run,
      loading,
      error,
      verdictMessage,
      verdictError,
      submittingVerdict,
      dialogVisible,
      awaitingHumanIndex,
      stepItems,
      sessionEntries,
      inputsText,
      agentName,
      verifierLabel,
      formatTime,
      submissionText,
      refresh,
      handleVerdict,
      handleDelete,
      openSession,
    };
  },
});
</script>
