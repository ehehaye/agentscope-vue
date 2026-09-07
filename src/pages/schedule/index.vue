<template>
  <div class="flex size-full p-2">
    <main class="shadow-panel flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden tw-rounded-22px bg-card">
      <div class="flex items-start justify-between gap-3 px-6 pt-5 pb-4">
        <div>
          <div class="text-2xl font-semibold">{{ COMMON.schedule }}</div>
          <div class="mt-1 text-sm text-muted-foreground">{{ TEXT.schedule.subtitle }}</div>
        </div>
        <div class="flex items-center gap-2">
          <el-button size="small" @click="createVisible = true">
            <Icon icon="lucide:plus" class="h-4 w-4" />
          </el-button>
          <el-radio-group v-model="viewMode" size="small">
            <el-radio-button label="calendar">
              <span class="inline-flex items-center gap-1">
                <Icon icon="lucide:calendar" class="h-4 w-4" />
                <span>{{ TEXT.schedule.calendar }}</span>
              </span>
            </el-radio-button>
            <el-radio-button label="list">
              <span class="inline-flex items-center gap-1">
                <Icon icon="lucide:list" class="h-4 w-4" />
                <span>{{ TEXT.schedule.list }}</span>
              </span>
            </el-radio-button>
          </el-radio-group>
        </div>
      </div>
      <el-divider />

      <div class="flex-1 overflow-hidden">
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
import { defineComponent, ref, computed } from '@vue/composition-api';
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
