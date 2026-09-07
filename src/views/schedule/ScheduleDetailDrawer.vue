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
      <div v-if="schedule" class="flex h-full flex-col gap-4 p-4">
        <p class="text-sm text-muted-foreground">{{ schedule.data.description }}</p>

        <div class="flex flex-col gap-2">
          <h3 class="text-sm font-semibold text-secondary-foreground">{{ COMMON.information }}</h3>
          <div class="flex flex-col gap-2">
            <div
              v-for="item in scheduleInfoItems"
              :key="item.title"
              class="flex flex-row items-center justify-between rounded-md px-2.5 py-2 text-xs font-mono ring-1 ring-border"
            >
              <span class="font-medium">{{ item.title.toUpperCase() }}</span>
              <span class="ml-auto text-muted-foreground">{{ item.content }}</span>
            </div>
          </div>
        </div>

        <el-divider />

        <div class="flex flex-1 flex-col gap-2 overflow-hidden">
          <h3 class="text-sm font-semibold">{{ TEXT.schedule.executionHistory }}</h3>
          <div class="flex-1 overflow-y-auto space-y-1">
            <div v-if="sessionsLoading" class="py-4 text-center text-sm text-muted-foreground">{{ COMMON.loading }}</div>
            <div v-else-if="sessions.length === 0" class="py-4 text-center text-sm text-muted-foreground">{{ COMMON.noData }}</div>
            <div
              v-for="session in sessions"
              v-else
              :key="session.id"
              class="flex cursor-pointer flex-row items-center justify-between rounded-md px-2.5 py-2 text-xs font-mono ring-1 ring-border transition-colors hover:bg-muted/50"
              @click="goToSession(session)"
            >
              <span class="text-muted-foreground">{{ new Date(session.created_at).toLocaleString() }}</span>
              <StatusBadge status="completed" />
            </div>
          </div>
        </div>

        <div class="mt-auto pt-2">
          <el-button type="danger" size="small" @click="openDelete = true">
            <Icon icon="lucide:trash-2" class="mr-1 h-3 w-3" />
            {{ COMMON.delete }}
          </el-button>
        </div>
      </div>
    </el-drawer>

    <DeleteDialog
      :visible.sync="openDelete"
      :title="deleteTitle"
      :description="COMMON.deleteDescription"
      :loading="deleting"
      @confirm="handleDelete"
    />
  </div>
</template>

<script>
import { defineComponent, ref, computed, watch, getCurrentInstance } from '@vue/composition-api';
import { Icon } from '@iconify/vue2';
import DeleteDialog from '@/components/dialog/DeleteDialog.vue';
import StatusBadge from '@/components/badge/StatusBadge.vue';
import { scheduleApi } from '@/api';
import { COMMON } from '@/constants/text';
import { TEXT } from './text';
import { parseCronExpression, getFrequencyLabel } from './schedule-utils';

export default defineComponent({
  name: 'ScheduleDetailDrawer',
  components: { Icon, DeleteDialog, StatusBadge },
  props: {
    visible: { type: Boolean, default: false },
    schedule: { type: Object, default: null },
  },
  setup(props, { emit }) {
    const instance = getCurrentInstance();
    const router = instance?.proxy?.$router;
    const sessions = ref([]);
    const sessionsLoading = ref(false);
    const openDelete = ref(false);
    const deleting = ref(false);

    const agentName = computed(() => {
      return props.schedule?.agent_id || '';
    });

    const weekdayNames = [
      TEXT.schedule.sunday,
      TEXT.schedule.monday,
      TEXT.schedule.tuesday,
      TEXT.schedule.wednesday,
      TEXT.schedule.thursday,
      TEXT.schedule.friday,
      TEXT.schedule.saturday,
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
          triggerTimeDisplay = `${parsed.dayOfMonth ?? 1}${TEXT.schedule.dayOfMonthSuffix} ${parsed.time}`;
          break;
        case 'once':
          triggerTimeDisplay = parsed.date
            ? `${parsed.date.toLocaleDateString()} ${parsed.time}`
            : parsed.time;
          break;
      }
      triggerTimeDisplay += ` (${data.timezone})`;

      return [
        { title: TEXT.schedule.frequency, content: getFrequencyLabel(parsed, TEXT.schedule) },
        { title: TEXT.schedule.triggerTime, content: triggerTimeDisplay },
        { title: TEXT.schedule.createdAt, content: new Date(props.schedule.created_at).toLocaleString() },
        { title: TEXT.schedule.end_at, content: data.ended_at ? new Date(data.ended_at).toLocaleString() : COMMON.noData },
        { title: COMMON.agent, content: agentName.value },
        { title: TEXT.schedule.permissionMode, content: data.permission_mode },
        { title: TEXT.schedule.stateful, content: data.stateful ? COMMON.yes : COMMON.no },
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
      if (!props.schedule) return;
      deleting.value = true;
      try {
        await emit('delete', props.schedule.id);
        openDelete.value = false;
        emit('update:visible', false);
      } finally {
        deleting.value = false;
      }
    }

    const deleteTitle = computed(() => {
      return COMMON.deleteTitle(TEXT.schedule.deleteSchedule.entity, props.schedule?.data?.name || '');
    });

    return {
      sessions,
      sessionsLoading,
      openDelete,
      deleting,
      scheduleInfoItems,
      agentName,
      goToSession,
      handleDelete,
      deleteTitle,
      COMMON,
      TEXT,
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
