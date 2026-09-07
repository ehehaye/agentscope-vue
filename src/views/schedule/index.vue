<template>
  <div class="tw-flex tw-size-full tw-p-2">
    <main class="tw-shadow-panel tw-flex tw-h-full tw-min-h-0 tw-min-w-0 tw-flex-1 tw-flex-col tw-overflow-hidden tw-rounded-22px tw-bg-card">
      <div class="tw-flex tw-items-start tw-justify-between tw-gap-3 tw-px-6 tw-pt-5 tw-pb-4">
        <div>
          <div class="tw-text-2xl tw-font-semibold">{{ COMMON.schedule }}</div>
          <div class="tw-mt-1 tw-text-sm tw-text-muted-foreground">{{ TEXT.schedule.subtitle }}</div>
        </div>
        <div class="tw-flex tw-items-center tw-gap-2">
          <el-button size="small" @click="createVisible = true">
            <Icon icon="lucide:plus" class="tw-h-4 tw-w-4" />
          </el-button>
          <el-radio-group v-model="viewMode" size="small">
            <el-radio-button label="calendar">
              <span class="tw-inline-flex tw-items-center tw-gap-1">
                <Icon icon="lucide:calendar" class="tw-h-4 tw-w-4" />
                <span>{{ TEXT.schedule.calendar }}</span>
              </span>
            </el-radio-button>
            <el-radio-button label="list">
              <span class="tw-inline-flex tw-items-center tw-gap-1">
                <Icon icon="lucide:list" class="tw-h-4 tw-w-4" />
                <span>{{ TEXT.schedule.list }}</span>
              </span>
            </el-radio-button>
          </el-radio-group>
        </div>
      </div>
      <el-divider />

      <div class="tw-flex-1 tw-overflow-hidden">
        <CalendarTabPage
          v-if="viewMode === 'calendar'"
          :events="events"
          :current-date="currentDate"
          @month-change="currentDate = $event"
          @event-click="handleEventClick"
        />
        <ListTabPage
          v-else
          :schedules="schedules"
          :loading="loading"
          @delete="remove"
        />
      </div>
    </main>

    <ScheduleDetailDrawer
      :visible.sync="detailVisible"
      :schedule="selectedSchedule"
      @delete="remove"
    />

    <CreateScheduleDialog
      :visible.sync="createVisible"
      :agents="agents"
      @submit="handleCreate"
    />
  </div>
</template>

<script>
import { defineComponent, ref, computed } from '@/composables/vue';
import { Icon } from '@iconify/vue2';
import { CronExpressionParser } from 'cron-parser';
import CalendarTabPage from './CalendarTabPage.vue';
import ListTabPage from './ListTabPage.vue';
import ScheduleDetailDrawer from './ScheduleDetailDrawer.vue';
import CreateScheduleDialog from './CreateScheduleDialog.vue';
import { useSchedules } from '@/composables/useSchedules';
import { useAgents } from '@/composables/useAgents';
import { COMMON } from '@/constants/text';
import { TEXT } from './text';

function expandScheduleToEvents(schedule, rangeStart, rangeEnd) {
  const events = [];
  const data = schedule.data;
  try {
    const interval = CronExpressionParser.parse(data.cron_expression, {
      currentDate: rangeStart,
      endDate: rangeEnd,
    });
    const startTs = new Date(data.started_at).getTime();
    const endTs = data.ended_at ? new Date(data.ended_at).getTime() : null;
    while (interval.hasNext()) {
      const date = interval.next().toDate();
      const ts = date.getTime();
      if (ts < startTs) continue;
      if (endTs && ts > endTs) break;
      const localDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      const localTime = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
      events.push({
        id: `${schedule.id}:${ts}`,
        title: data.name,
        date: localDate,
        time: localTime,
        content: data.description,
      });
    }
  } catch {
    // invalid cron expr — skip
  }
  return events;
}

export default defineComponent({
  name: 'SchedulePage',
  components: { Icon, CalendarTabPage, ListTabPage, ScheduleDetailDrawer, CreateScheduleDialog },
  setup() {
    const { schedules, loading, remove, create, refetch } = useSchedules();
		const { agents } = useAgents();
		const viewMode = ref('calendar');
    const currentDate = ref(new Date());
    const selectedSchedule = ref(null);
    const createVisible = ref(false);

    const rangeStart = computed(() => new Date(currentDate.value.getFullYear(), currentDate.value.getMonth(), 1));
    const rangeEnd = computed(() => new Date(currentDate.value.getFullYear(), currentDate.value.getMonth() + 1, 0, 23, 59, 59));

    const events = computed(() => {
      return schedules.value
        .filter((s) => s.data.enabled)
        .flatMap((s) => expandScheduleToEvents(s, rangeStart.value, rangeEnd.value));
    });

    const detailVisible = computed({
      get: () => !!selectedSchedule.value,
      set: (v) => { if (!v) selectedSchedule.value = null; },
    });

    function handleEventClick(event) {
      const scheduleId = event.id.split(':')[0];
      const schedule = schedules.value.find((s) => s.id === scheduleId);
      if (schedule) selectedSchedule.value = schedule;
    }

    async function handleCreate(body) {
      await create(body);
      createVisible.value = false;
      await refetch();
    }

    return {
      schedules,
      loading,
      remove,
      agents,
      viewMode,
      currentDate,
      selectedSchedule,
      createVisible,
      detailVisible,
      events,
      handleEventClick,
      handleCreate,
      COMMON,
      TEXT,
    };
  },
});
</script>
