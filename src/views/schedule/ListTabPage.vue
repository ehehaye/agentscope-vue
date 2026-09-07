<template>
  <div class="flex size-full flex-col">
    <div class="flex w-full flex-row justify-between p-4">
      <el-date-picker
        v-model="dateRange"
        type="daterange"
        range-separator="至"
        start-placeholder="开始日期"
        end-placeholder="结束日期"
        value-format="yyyy-MM-dd"
        class="w-72"
      />
    </div>
    <div class="size-full overflow-y-auto p-4">
      <div v-if="loading" class="flex h-full items-center justify-center text-muted-foreground">
        {{ COMMON.loading }}
      </div>
      <EmptyState v-else-if="filteredSchedules.length === 0" />
      <div v-else class="space-y-3">
        <ScheduleCard
          v-for="schedule in filteredSchedules"
          :key="schedule.id"
          :schedule="schedule"
          @click="selectedSchedule = schedule"
        />
      </div>
    </div>

    <ScheduleDetailDrawer
      :visible.sync="detailVisible"
      :schedule="selectedSchedule"
      @delete="$emit('delete', $event)"
    />
  </div>
</template>

<script>
import { defineComponent, ref, computed } from '@/composables/vue';
import { CronExpressionParser } from 'cron-parser';
import ScheduleCard from './ScheduleCard.vue';
import ScheduleDetailDrawer from './ScheduleDetailDrawer.vue';
import EmptyState from './EmptyState.vue';
import { COMMON } from '@/constants/text';

export default defineComponent({
  name: 'ListTabPage',
  components: { ScheduleCard, ScheduleDetailDrawer, EmptyState },
  props: {
    schedules: { type: Array, default: () => [] },
    loading: { type: Boolean, default: false },
  },
  setup(props) {
    const dateRange = ref([]);
    const selectedSchedule = ref(null);

    const detailVisible = computed({
      get: () => !!selectedSchedule.value,
      set: (v) => { if (!v) selectedSchedule.value = null; },
    });

    function scheduleHasOccurrencesInRange(schedule, rangeStart, rangeEnd) {
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
          return true;
        }
        return false;
      } catch {
        return true;
      }
    }

    const filteredSchedules = computed(() => {
      if (!dateRange.value || dateRange.value.length === 0) {
        return props.schedules;
      }
      const rangeStart = new Date(dateRange.value[0]);
      const rangeEnd = dateRange.value[1] ? new Date(dateRange.value[1]) : rangeStart;
      return props.schedules.filter((schedule) => scheduleHasOccurrencesInRange(schedule, rangeStart, rangeEnd));
    });

    return { dateRange, selectedSchedule, detailVisible, filteredSchedules, COMMON };
  },
});
</script>
