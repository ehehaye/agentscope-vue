<template>
  <div>
    <el-drawer
      :visible.sync="visible"
      :title="schedule?.data?.name || ''"
      size="30rem"
      :with-header="true"
      direction="rtl"
      custom-class="schedule-detail-drawer"
      @close="$emit('update:visible', false)"
    >
      <div v-if="schedule" class="tw-flex tw-h-full tw-flex-col tw-gap-4 tw-p-4">
        <p class="tw-text-sm tw-text-muted-foreground">{{ schedule.data.description }}</p>

        <div class="tw-flex tw-flex-col tw-gap-2">
          <h3 class="tw-text-sm tw-font-semibold tw-text-secondary-foreground">信息</h3>
          <div class="tw-flex tw-flex-col tw-gap-2">
            <div
              v-for="item in scheduleInfoItems"
              :key="item.title"
              class="tw-flex tw-flex-row tw-items-center tw-justify-between tw-rounded-md tw-px-2.5 tw-py-2 tw-text-xs tw-font-mono tw-ring-1 tw-ring-border"
            >
              <span class="tw-font-medium">{{ item.title.toUpperCase() }}</span>
              <span class="tw-ml-auto tw-text-muted-foreground">{{ item.content }}</span>
            </div>
          </div>
        </div>

        <el-divider />

        <div class="tw-flex tw-flex-1 tw-flex-col tw-gap-2 tw-overflow-hidden">
          <h3 class="tw-text-sm tw-font-semibold">执行历史</h3>
          <div class="tw-flex-1 tw-overflow-y-auto tw-space-y-1">
            <div v-if="sessionsLoading" class="tw-py-4 tw-text-center tw-text-sm tw-text-muted-foreground">加载中...</div>
            <div v-else-if="sessions.length === 0" class="tw-py-4 tw-text-center tw-text-sm tw-text-muted-foreground">暂无数据</div>
            <div
              v-for="session in sessions"
              v-else
              :key="session.id"
              class="tw-flex tw-cursor-pointer tw-flex-row tw-items-center tw-justify-between tw-rounded-md tw-px-2.5 tw-py-2 tw-text-xs tw-font-mono tw-ring-1 tw-ring-border tw-transition-colors hover:tw-bg-muted/50"
              @click="goToSession(session)"
            >
              <span class="tw-text-muted-foreground">{{ new Date(session.created_at).toLocaleString() }}</span>
              <StatusBadge status="completed" />
            </div>
          </div>
        </div>

        <div class="tw-mt-auto tw-pt-2">
          <el-button type="danger" size="small" @click="handleDelete">
            <Icon icon="lucide:trash-2" class="tw-mr-1 tw-h-3 tw-w-3" />
            删除
          </el-button>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<script>
import { defineComponent, ref, computed, watch, getCurrentInstance } from '@/composables/vue';
import { MessageBox } from 'element-ui';
import { Icon } from '@/plugins/iconify';
import StatusBadge from '@/components/badge/StatusBadge.vue';
import { scheduleApi } from '@/api';
import { parseCronExpression, getFrequencyLabel } from './schedule-utils';

export default defineComponent({
  name: 'ScheduleDetailDrawer',
  components: { Icon, StatusBadge },
  props: {
    visible: { type: Boolean, default: false },
    schedule: { type: Object, default: null },
  },
  setup(props, { emit }) {
    const instance = getCurrentInstance();
    const router = instance?.proxy?.$router;
    const sessions = ref([]);
    const sessionsLoading = ref(false);

    const agentName = computed(() => {
      return props.schedule?.agent_id || '';
    });

    const weekdayNames = [
      '周日',
      '周一',
      '周二',
      '周三',
      '周四',
      '周五',
      '周六',
    ];

    const scheduleInfoItems = computed(() => {
      if (!props.schedule) return [];
      const data = props.schedule.data;
      const parsed = parseCronExpression(data.cron_expression, data.started_at);

      let triggerTimeDisplay = parsed.time;
      switch (parsed.frequency) {
        case 'weekly':
          triggerTimeDisplay = `${weekdayNames[parsed.weekday ?? 0]} ${parsed.time}`;
          break;
        case 'monthly':
          triggerTimeDisplay = `${parsed.dayOfMonth ?? 1}日 ${parsed.time}`;
          break;
        case 'once':
          triggerTimeDisplay = parsed.date
            ? `${parsed.date.toLocaleDateString()} ${parsed.time}`
            : parsed.time;
          break;
      }
      triggerTimeDisplay += ` (${data.timezone})`;

      return [
        { title: '频率', content: getFrequencyLabel(parsed) },
        { title: '触发时间', content: triggerTimeDisplay },
        { title: '创建时间', content: new Date(props.schedule.created_at).toLocaleString() },
        { title: '结束时间', content: data.ended_at ? new Date(data.ended_at).toLocaleString() : '暂无数据' },
        { title: '智能体', content: agentName.value },
        { title: '权限模式', content: data.permission_mode },
        { title: '有状态', content: data.stateful ? '是' : '否' },
      ];
    });

    async function fetchSessions() {
      if (!props.schedule || !props.visible) {
        sessions.value = [];
        return;
      }
      sessionsLoading.value = true;
      try {
        const res = await scheduleApi.listSessions(props.schedule.id);
        sessions.value = res?.sessions || [];
      } catch {
        sessions.value = [];
      } finally {
        sessionsLoading.value = false;
      }
    }

    watch(() => [props.schedule, props.visible], fetchSessions, { immediate: true });

    function goToSession(session) {
      router.push(`/chat/${props.schedule.agent_id}/${session.id}`);
      emit('update:visible', false);
    }

    async function handleDelete() {
      const schedule = props.schedule;
      if (!schedule) return;
      await MessageBox.confirm(
        '此操作无法撤销。',
        `删除日程 "${schedule.data?.name || ''}"？`,
        {
          type: 'warning',
          confirmButtonText: '删除',
          cancelButtonText: '取消',
        },
      );
      await emit('delete', schedule.id);
      emit('update:visible', false);
    }

    return {
      sessions,
      sessionsLoading,
      scheduleInfoItems,
      agentName,
      goToSession,
      handleDelete,
    };
  },
});
</script>

<style>
.schedule-detail-drawer .el-drawer__body {
  padding: 0;
  overflow: hidden;
}
</style>
