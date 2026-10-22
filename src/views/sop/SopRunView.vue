<template>
  <div class="tw-flex tw-size-full tw-flex-col tw-p-2">
    <main
      class="tw-shadow-panel tw-flex tw-min-h-0 tw-flex-1 tw-flex-col tw-overflow-hidden tw-rounded-22px tw-bg-card"
    >
      <header class="tw-flex tw-shrink-0 tw-items-center tw-gap-2 tw-px-4 tw-py-2">
        <el-button
          type="text"
          size="mini"
          title="返回流程详情"
          class="tw-shrink-0 tw-p-1"
          @click="goBack"
        >
          <Icon
            icon="lucide:arrow-left"
            class="tw-h-4 tw-w-4"
          />
        </el-button>
        <div class="tw-flex tw-min-w-0 tw-flex-1 tw-flex-col">
          <div class="tw-flex tw-min-w-0 tw-items-center tw-gap-2">
            <span class="tw-min-w-0 tw-truncate tw-text-base tw-font-medium">{{
              run?.definition?.name || '运行详情'
            }}</span>
            <StatusBadge
              v-if="run"
              class="tw-shrink-0"
              :status="run.state?.phase || 'pending'"
            />
          </div>
          <span
            v-if="run"
            class="tw-truncate tw-text-10px tw-text-muted-foreground"
          >
            {{ formatTime(run.created_at) }} · 起步输入：{{ inputsText || '无' }}
          </span>
        </div>
        <div
          v-if="run"
          class="tw-flex tw-shrink-0 tw-items-center tw-gap-1"
        >
          <el-button
            v-if="canRefresh"
            type="text"
            size="mini"
            title="刷新运行"
            :disabled="loading"
            @click="refresh"
          >
            <Icon
              icon="lucide:refresh-cw"
              class="tw-h-3.5 tw-w-3.5"
              :class="{ 'tw-animate-spin': loading }"
            />
          </el-button>
          <el-button
            type="text"
            size="mini"
            title="删除运行"
            class="run-delete-btn"
            @click="handleDelete"
          >
            <Icon
              icon="lucide:trash-2"
              class="tw-h-3.5 tw-w-3.5"
            />
          </el-button>
        </div>
      </header>

      <div class="tw-h-px tw-shrink-0 tw-bg-border"></div>

      <div
        v-if="loading && !run"
        class="tw-flex tw-flex-1 tw-items-center tw-justify-center"
      >
        <Spinner class="tw-h-6 tw-w-6" />
      </div>

      <div
        v-else-if="error && !run"
        class="tw-flex tw-flex-1 tw-flex-col tw-items-center tw-justify-center tw-gap-2 tw-px-6 tw-text-center"
      >
        <p class="tw-text-sm tw-text-destructive">{{ error }}</p>
        <el-button
          size="small"
          @click="refresh"
          >重试</el-button
        >
      </div>

      <template v-else-if="run">
        <div class="tw-flex tw-items-center">
          <div class="tw-min-w-0 tw-flex-1">
            <SopStepStrip
              :steps="stepItems"
              :active-index="activeStepIndex"
              @select="selectStep"
            />
          </div>
          <div class="tw-ml-2 tw-h-5 tw-w-px tw-shrink-0 tw-bg-border"></div>
          <SegmentedControl
            class="tw-ml-2 tw-mr-4 tw-shrink-0"
            :value="activeTab"
            :options="tabs"
            @input="setTab"
          />
        </div>

        <div class="tw-h-px tw-shrink-0 tw-bg-border"></div>

        <div class="tw-flex tw-min-h-0 tw-flex-1 tw-flex-col">
          <Scrollbar
            ref="deliveryRef"
            v-show="activeTab === 'delivery'"
            class="tw-min-h-0 tw-flex-1 tw-overflow-x-hidden"
            wrap-class="tw-overflow-x-hidden tw-p-4"
          >
            <SopStepDelivery
              :step="activeStep"
              :agents="agents"
              :awaiting-human="awaitingHumanIndex === activeStepIndex"
            />

            <p
              v-if="error"
              class="tw-mt-4 tw-whitespace-pre-wrap tw-text-xs tw-text-destructive"
            >
              {{ error }}
            </p>
          </Scrollbar>

          <div
            v-show="activeTab === 'session'"
            class="tw-min-h-0 tw-flex-1 tw-p-1"
          >
            <SopSessionViewer
              class="tw-min-h-0 tw-h-full"
              :entries="sessionEntries"
              :agents="agents"
              :run-id="run.id"
              :session-key="activeSessionKey"
              :focus-request="focusRequest"
            />
          </div>
        </div>

        <SopVerdictBar
          v-show="showVerdictBar"
          :question="activeStep?.definition.verifier?.question"
          v-model="verdictMessage"
          :submitting="submittingVerdict"
          :error="verdictError"
          @submit="handleVerdict"
        />
      </template>
    </main>
  </div>
</template>

<script>
import { defineComponent, ref, computed, watch, onUnmounted, nextTick } from '@/composables/vue';
import { useRoute, useRouter } from '@/composables/vue-router';
import Icon from '@/components/ui/Icon';
import Spinner from '@/components/ui/Spinner.vue';
import Scrollbar from '@/components/ui/Scrollbar.vue';
import StatusBadge from '@/components/badge/StatusBadge.vue';
import SegmentedControl from '@/components/ui/SegmentedControl.vue';
import SopVerdictBar from '@/components/sop/SopVerdictBar.vue';
import { sopApi } from '@/api';
import { confirmDialog } from '@/utils/common';
import { useAgents } from '@/composables/useAgents';
import SopStepStrip from './SopStepStrip.vue';
import SopStepDelivery from './SopStepDelivery.vue';
import SopSessionViewer from './SopSessionViewer.vue';
import {
  collectRunSessions,
  collectStepAnchorIds,
  flattenTextBlocks,
  getAwaitingHumanStepIndex,
  getFollowingStepIndex,
  getInitialStepIndex,
  resolveRunSopId,
} from './sop-utils';

const POLL_INTERVAL_MS = 2500;

// 进入运行详情前的路由：从流程详情进来时，返回直接回退历史，让列表按原 URL（含分页）恢复。
let entryFrom = null;

export default defineComponent({
  name: 'SopRunView',
  components: {
    Icon,
    Spinner,
    StatusBadge,
    Scrollbar,
    SegmentedControl,
    SopVerdictBar,
    SopStepStrip,
    SopStepDelivery,
    SopSessionViewer,
  },
  beforeRouteEnter(to, from, next) {
    entryFrom = from?.name ? { name: from.name, params: { ...from.params } } : null;
    next();
  },
  setup() {
    const route = useRoute();
    const router = useRouter();

    const sopId = computed(() => route.params.sopId || '');
    const sopRunId = computed(() => route.params.runId || '');

    const run = ref(null);
    const loading = ref(false);
    const error = ref('');
    const verdictMessage = ref('');
    const verdictError = ref('');
    const submittingVerdict = ref(false);

    const activeStepIndex = ref(0);
    // 每个步骤独立记忆自己的「交付 / 会话」Tab，切换步骤不会串用。
    const tabsByStep = ref({});
    const activeTab = computed({
      get: () => tabsByStep.value[activeStepIndex.value] || 'delivery',
      set: (value) => {
        tabsByStep.value = { ...tabsByStep.value, [activeStepIndex.value]: value };
      },
    });
    const focusRequest = ref(null);
    const deliveryRef = ref(null);

    const tabs = [
      { value: 'delivery', label: '交付' },
      { value: 'session', label: '会话' },
    ];

    let pollTimer = null;
    let requestSeq = 0;
    let initialized = false;
    let focusToken = 0;

    const { agents } = useAgents();

    const awaitingHumanIndex = computed(() => getAwaitingHumanStepIndex(run.value));

    const stepItems = computed(() =>
      (run.value?.definition?.steps ?? []).map((definition, index) => ({
        definition,
        index,
        state: run.value?.state?.steps?.[index] ?? {},
      })),
    );

    const stepPhases = computed(() =>
      (run.value?.definition?.steps ?? []).map((_, index) => run.value?.state?.steps?.[index]?.phase || 'pending'),
    );

    const stepSessions = computed(() =>
      (run.value?.definition?.steps ?? []).map((step) => step.executor?.session_key || ''),
    );

    const stepSubjects = computed(() => (run.value?.definition?.steps ?? []).map((step) => step.subject || ''));

    const activeStep = computed(() => stepItems.value[activeStepIndex.value] || null);
    const activeSessionKey = computed(() => stepSessions.value[activeStepIndex.value] || '');
    const sessionEntries = computed(() => collectRunSessions(run.value));
    const canRefresh = computed(() => ['pending', 'running', 'awaiting'].includes(run.value?.state?.phase));
    const followingIndex = computed(() => getFollowingStepIndex(stepPhases.value));
    const showVerdictBar = computed(
      () => activeTab.value === 'delivery' && awaitingHumanIndex.value === activeStepIndex.value,
    );

    const inputsText = computed(() => {
      const inputs = run.value?.state?.inputs ?? [];
      return inputs
        .map((msg) => flattenTextBlocks(msg.content))
        .filter(Boolean)
        .join('\n');
    });

    function formatTime(value) {
      return value ? new Date(value).toLocaleString() : '—';
    }

    function requestFocus(index) {
      const key = stepSessions.value[index] || '';
      if (!key) return;
      focusRequest.value = {
        sessionKey: key,
        subject: stepSubjects.value[index] || '',
        ids: collectStepAnchorIds(run.value, index),
        token: ++focusToken,
      };
    }

    function applyStep(index) {
      if (index < 0 || index >= stepItems.value.length) return;
      activeStepIndex.value = index;
      // 该步骤上次停留在「会话」时，切过去的同时定位到它的消息起点。
      if (activeTab.value === 'session') requestFocus(index);
    }

    function selectStep(index) {
      applyStep(index);
    }

    function setTab(tab) {
      if (activeTab.value === tab) return;
      activeTab.value = tab;
      if (tab === 'session') requestFocus(activeStepIndex.value);
    }

    // 切换步骤时交付区回到顶部，避免停留在上一步的滚动位置。
    watch(activeStepIndex, () => {
      nextTick(() => {
        // Scrollbar 的内部滚动容器是 wrap，重置后同步重算滚动条尺寸。
        const wrap = deliveryRef.value?.$refs?.wrap;
        if (wrap) wrap.scrollTop = 0;
        deliveryRef.value?.update?.();
      });
    });

    // 新步骤开始（或进入待处理）时自动跟随；轮询到相同步骤不会打断手动选择。
    watch(followingIndex, (index, previous) => {
      if (!initialized || index < 0 || index === previous) return;
      applyStep(index);
    });

    function clearTimer() {
      if (pollTimer) {
        clearTimeout(pollTimer);
        pollTimer = null;
      }
    }

    function shouldPoll() {
      return canRefresh.value;
    }

    async function load({ silent = false } = {}) {
      const runId = sopRunId.value;
      if (!runId) return;
      const seq = ++requestSeq;
      if (!silent) loading.value = true;
      error.value = '';
      try {
        const res = await sopApi.getRun(runId);
        if (seq !== requestSeq) return;
        // 深链中的 sopId 可能与运行实际归属不一致，以运行记录为准纠正路由。
        const actualSopId = resolveRunSopId(res, sopId.value);
        if (actualSopId && actualSopId !== sopId.value) {
          router.replace({
            name: 'sop-run',
            params: { sopId: actualSopId, runId: res?.id || runId },
            query: { ...route.query },
          });
        }
        run.value = res;
        if (!initialized) {
          activeStepIndex.value = getInitialStepIndex(stepPhases.value);
          initialized = true;
        }
      } catch (e) {
        if (seq === requestSeq) error.value = e?.message || String(e);
      } finally {
        if (seq === requestSeq) loading.value = false;
      }
    }

    async function poll() {
      await load({ silent: run.value !== null });
      if (sopRunId.value && shouldPoll()) {
        pollTimer = setTimeout(poll, POLL_INTERVAL_MS);
      }
    }

    function startPolling() {
      clearTimer();
      if (sopRunId.value) poll();
    }

    async function refresh() {
      clearTimer();
      await load();
      if (sopRunId.value && shouldPoll()) {
        pollTimer = setTimeout(poll, POLL_INTERVAL_MS);
      }
    }

    watch(
      sopRunId,
      (runId, previous) => {
        if (!runId) return;
        if (runId !== previous) {
          run.value = null;
          initialized = false;
          activeStepIndex.value = 0;
          tabsByStep.value = {};
          focusRequest.value = null;
          verdictMessage.value = '';
          verdictError.value = '';
        }
        startPolling();
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

    function goBack() {
      // 从同一个流程的详情页进来时回退历史，列表的筛选、排序、页码由原 URL 恢复。
      if (entryFrom?.name === 'sop-detail' && entryFrom.params?.sopId === sopId.value) {
        router.back();
        return;
      }
      router.push({ name: 'sop-detail', params: { sopId: sopId.value } });
    }

    async function handleDelete() {
      if (!run.value) return;
      await confirmDialog({
        message: '确定删除这次运行吗？它创建的会话与工作区会一并删除，不可恢复。',
        onSubmit: async () => {
          await sopApi.removeRun(run.value.id);
          goBack();
        },
      });
    }

    return {
      run,
      loading,
      error,
      agents,
      tabs,
      activeTab,
      activeStepIndex,
      activeStep,
      activeSessionKey,
      sessionEntries,
      stepItems,
      canRefresh,
      showVerdictBar,
      focusRequest,
      deliveryRef,
      awaitingHumanIndex,
      verdictMessage,
      verdictError,
      submittingVerdict,
      inputsText,
      formatTime,
      selectStep,
      setTab,
      refresh,
      handleVerdict,
      handleDelete,
      goBack,
    };
  },
});
</script>
