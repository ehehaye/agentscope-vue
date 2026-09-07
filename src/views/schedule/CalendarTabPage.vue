<template>
  <div class="tw-flex tw-size-full tw-flex-col">
    <div class="tw-flex tw-items-center tw-justify-between tw-p-4">
      <h2 class="tw-text-xl tw-font-semibold">{{ monthLabel }}</h2>
      <div class="tw-flex tw-items-center tw-gap-2">
        <el-button size="small" @click="goToToday">{{ TEXT.schedule.today }}</el-button>
        <el-tooltip :content="TEXT.schedule.previousYear" placement="top">
          <el-button size="small" icon="el-icon-d-arrow-left" @click="goToPrevYear" />
        </el-tooltip>
        <el-tooltip :content="TEXT.schedule.previousMonth" placement="top">
          <el-button size="small" icon="el-icon-arrow-left" @click="goToPrevMonth" />
        </el-tooltip>
        <el-tooltip :content="TEXT.schedule.nextMonth" placement="top">
          <el-button size="small" icon="el-icon-arrow-right" @click="goToNextMonth" />
        </el-tooltip>
        <el-tooltip :content="TEXT.schedule.nextYear" placement="top">
          <el-button size="small" icon="el-icon-d-arrow-right" @click="goToNextYear" />
        </el-tooltip>
      </div>
    </div>

    <div class="tw-flex tw-flex-1 tw-flex-col">
      <div class="tw-grid tw-grid-cols-7 tw-border-b tw-border-border">
        <div v-for="day in weekDays" :key="day" class="tw-py-2 tw-text-center tw-text-sm tw-font-medium tw-text-muted-foreground">
          {{ day }}
        </div>
      </div>

      <div class="tw-grid tw-flex-1 tw-grid-cols-7" :style="{ gridTemplateRows: `repeat(${weeksNeeded}, minmax(0, 1fr))` }">
        <div
          v-for="(day, index) in prevMonthDays"
          :key="`prev-${index}`"
          class="tw-border-r tw-border-b tw-border-border tw-p-2 tw-text-muted-foreground/50"
        >
          <div class="tw-text-sm">{{ day }}</div>
        </div>

        <DateCell
          v-for="day in currentMonthDays"
          :key="`current-${day}`"
          :day="day"
          :is-today="isToday(day)"
          :events="getEventsForDate(day)"
          :more-text="TEXT.schedule.more"
          @event-click="$emit('event-click', $event)"
        />

        <div
          v-for="(day, index) in nextMonthDays"
          :key="`next-${index}`"
          class="tw-border-r tw-border-b tw-border-border tw-p-2 tw-text-muted-foreground/50"
        >
          <div class="tw-text-sm">{{ day }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { defineComponent, computed } from '@/composables/vue';
import DateCell from './DateCell.vue';
import { TEXT } from './text';

export default defineComponent({
  name: 'CalendarTabPage',
  components: { DateCell },
  props: {
    events: { type: Array, default: () => [] },
    currentDate: { type: Date, default: () => new Date() },
  },
  setup(props, { emit }) {
    const year = computed(() => props.currentDate.getFullYear());
    const month = computed(() => props.currentDate.getMonth());

    const monthLabel = computed(() => {
      return new Date(year.value, month.value).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' });
    });

    const firstDay = computed(() => new Date(year.value, month.value, 1));
    const lastDay = computed(() => new Date(year.value, month.value + 1, 0));
    const firstDayOfWeek = computed(() => firstDay.value.getDay());
    const prevMonthLastDay = computed(() => new Date(year.value, month.value, 0).getDate());

    const prevMonthDays = computed(() => {
      return Array.from({ length: firstDayOfWeek.value }, (_, i) => prevMonthLastDay.value - firstDayOfWeek.value + i + 1);
    });

    const currentMonthDays = computed(() => {
      return Array.from({ length: lastDay.value.getDate() }, (_, i) => i + 1);
    });

    const weeksNeeded = computed(() => {
      const total = prevMonthDays.value.length + currentMonthDays.value.length;
      return Math.ceil(total / 7);
    });

    const totalCells = computed(() => weeksNeeded.value * 7);
    const remainingCells = computed(() => totalCells.value - prevMonthDays.value.length - currentMonthDays.value.length);

    const nextMonthDays = computed(() => {
      return Array.from({ length: remainingCells.value }, (_, i) => i + 1);
    });

    const weekDays = computed(() => [
      TEXT.schedule.sunday,
      TEXT.schedule.monday,
      TEXT.schedule.tuesday,
      TEXT.schedule.wednesday,
      TEXT.schedule.thursday,
      TEXT.schedule.friday,
      TEXT.schedule.saturday,
    ]);

    function isToday(day) {
      const date = new Date(year.value, month.value, day);
      const today = new Date();
      return date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
    }

    function getEventsForDate(day) {
      const date = new Date(year.value, month.value, day);
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${d}`;
      return props.events.filter((event) => event.date === dateStr);
    }

    function goToPrevMonth() {
      emit('month-change', new Date(year.value, month.value - 1, 1));
    }
    function goToNextMonth() {
      emit('month-change', new Date(year.value, month.value + 1, 1));
    }
    function goToPrevYear() {
      emit('month-change', new Date(year.value - 1, month.value, 1));
    }
    function goToNextYear() {
      emit('month-change', new Date(year.value + 1, month.value, 1));
    }
    function goToToday() {
      emit('month-change', new Date());
    }

    return {
      monthLabel,
      weekDays,
      prevMonthDays,
      currentMonthDays,
      nextMonthDays,
      weeksNeeded,
      isToday,
      getEventsForDate,
      goToPrevMonth,
      goToNextMonth,
      goToPrevYear,
      goToNextYear,
      goToToday,
      TEXT,
    };
  },
});
</script>
